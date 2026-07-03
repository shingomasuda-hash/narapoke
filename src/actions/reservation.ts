'use server';
/**
 * 席予約作成 Server Action。
 * フロー: Zod検証 → レート制限 → 静的ルール検証 → LINE検証 → 原子的RPC → 通知。
 * すべてサーバー側で判定し、失敗時は顧客向けの分かりやすい文言を返す。
 */
import { headers } from 'next/headers';
import { reservationInputSchema, type ReservationInput } from '@/lib/schemas';
import { toFriendly } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limit';
import { loadSettings, stayMinutesFor } from '@/lib/settings';
import {
  parseTimeToMinutes, jstInstant, isThursday, isWithinOpenWindows,
} from '@/lib/time';
import { canReserve } from '@/lib/availability';
import { generateReservationCode, generateCancelToken, hashToken } from '@/lib/codes';
import { normalizePhone, isValidJpPhone } from '@/lib/phone';
import { verifyLineIdToken } from '@/lib/line/verify';
import { notify } from '@/lib/line/client';
import { reservationFlex } from '@/lib/line/flex';
import { useMockData, env } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export interface ReservationResult {
  ok: boolean;
  code?: string;
  token?: string;
  errorCode?: string;
  message?: string;
}

export async function createReservationAction(raw: ReservationInput): Promise<ReservationResult> {
  // 1) 入力検証
  const parsed = reservationInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errorCode: 'INVALID', message: parsed.error.errors[0]?.message ?? toFriendly('INVALID') };
  }
  const input = parsed.data;

  // 2) レート制限（IP 単位）
  const ip = headers().get('x-forwarded-for') ?? 'local';
  if (!rateLimit(`res:${ip}`, 8, 60_000).ok) {
    return { ok: false, errorCode: 'UNKNOWN', message: 'アクセスが集中しています。少し時間をおいてお試しください。' };
  }

  const settings = await loadSettings();

  // 電話番号の正規化
  const phone = normalizePhone(input.phone);
  if (!isValidJpPhone(phone)) {
    return { ok: false, errorCode: 'INVALID', message: '電話番号の形式が正しくありません。' };
  }

  // 3) 静的ルール（レースしない部分はここで弾く）
  if (input.partySize > settings.maxPartySize) {
    return { ok: false, errorCode: 'TOO_MANY', message: toFriendly('TOO_MANY') };
  }
  if (isThursday(input.serviceDate)) {
    return { ok: false, errorCode: 'THURSDAY', message: toFriendly('THURSDAY') };
  }
  const startMin = parseTimeToMinutes(input.startTime);
  if (!isWithinOpenWindows(startMin)) {
    return { ok: false, errorCode: 'OUT_OF_HOURS', message: toFriendly('OUT_OF_HOURS') };
  }
  const startAt = jstInstant(input.serviceDate, startMin);
  const stay = stayMinutesFor(startMin, settings);
  const endAt = new Date(startAt.getTime() + stay * 60_000);

  // 受付締切（開始 N 分前）
  const cutoff = new Date(startAt.getTime() - settings.acceptCutoffMinutes * 60_000);
  if (Date.now() >= cutoff.getTime()) {
    return { ok: false, errorCode: 'PAST_CUTOFF', message: toFriendly('PAST_CUTOFF') };
  }
  // 予約可能期間（当日〜N日後）
  const maxDay = new Date(Date.now() + settings.reservationMaxDays * 86_400_000);
  if (startAt.getTime() > maxDay.getTime() + 86_400_000) {
    return { ok: false, errorCode: 'INVALID', message: `ご予約は${settings.reservationMaxDays}日先までとなります。` };
  }

  // 4) LINE ID トークン検証（渡された場合のみ・サーバー側で）
  let lineUserId: string | null = null;
  if (input.lineIdToken) {
    const v = await verifyLineIdToken(input.lineIdToken);
    if (v.ok) lineUserId = v.userId ?? null;
  }

  const code = generateReservationCode();
  const token = generateCancelToken();
  const tokenHash = hashToken(token);

  // ---- 開発モック（Supabase 未設定時） ----
  if (useMockData) {
    console.info('[MOCK] 予約作成', { code, serviceDate: input.serviceDate, startTime: input.startTime, partySize: input.partySize });
    return { ok: true, code, token };
  }

  // 5) 原子的登録（RPC）
  try {
    const sb = createSupabaseAdmin();

    // 事前の目安チェック（本判定は RPC 内で再実施）
    const { data: existing } = await sb
      .from('reservations')
      .select('start_at,end_at,party_size,status')
      .eq('service_date', input.serviceDate)
      .in('status', ['confirmed', 'completed']);
    const pre = canReserve({
      existing: (existing ?? []).map((r) => ({ start: new Date(r.start_at), end: new Date(r.end_at), size: r.party_size })),
      candidate: { start: startAt, end: endAt, size: input.partySize },
      capacity: settings.seatCapacity,
    });
    if (!pre.ok) return { ok: false, errorCode: 'FULL', message: toFriendly('FULL') };

    const { data, error } = await sb.rpc('create_reservation', {
      p_service_date: input.serviceDate,
      p_start_at: startAt.toISOString(),
      p_end_at: endAt.toISOString(),
      p_party_size: input.partySize,
      p_customer_name: input.customerName,
      p_phone: phone,
      p_email: input.email || null,
      p_line_user_id: lineUserId,
      p_note: input.note || null,
      p_child_count: input.childCount ?? 0,
      p_has_stroller: input.hasStroller ?? false,
      p_allergy: input.allergy || null,
      p_reservation_code: code,
      p_cancel_token_hash: tokenHash,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) {
      const known = ['CLOSED', 'PRIVATE', 'BLOCKED', 'FULL'].find((c) => error.message.includes(c));
      return { ok: false, errorCode: known ?? 'UNKNOWN', message: toFriendly(known) };
    }

    const row = data as { id: string; reservation_code: string };
    // 6) 通知（失敗しても予約は成功のまま。ログに残す）
    const whenLabel = `${input.serviceDate} ${input.startTime}`;
    if (lineUserId) {
      await notify({
        to: lineUserId,
        messages: [reservationFlex({ code: row.reservation_code, when: whenLabel, partySize: input.partySize, token })],
        targetType: 'reservation', targetId: row.id, kind: 'created',
      });
    }
    if (env.lineStaffDestinationId) {
      await notify({
        to: env.lineStaffDestinationId,
        messages: [{ type: 'text', text: `【新規予約】${whenLabel} ${input.partySize}名 ${input.customerName}様 (${row.reservation_code})` }],
        targetType: 'reservation', targetId: row.id, kind: 'staff_created',
      });
    }
    return { ok: true, code: row.reservation_code, token };
  } catch (e) {
    console.error('[reservation] 失敗', (e as Error).message);
    return { ok: false, errorCode: 'UNKNOWN', message: toFriendly('UNKNOWN') };
  }
}

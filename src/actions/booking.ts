'use server';
/**
 * トークンによる予約/注文の確認・変更・キャンセル。
 * トークンは平文保存していないため、ハッシュで突合する。個人情報は最小限のみ返す。
 */
import { headers } from 'next/headers';
import { hashToken } from '@/lib/codes';
import { cancelInputSchema } from '@/lib/schemas';
import { useMockData, env } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { loadSettings } from '@/lib/settings';
import { notify } from '@/lib/line/client';
import { staffReservationCancelNotice, staffTakeoutCancelNotice } from '@/lib/line/flex';
import { sendEmail } from '@/lib/email/client';
import { reservationCancelledEmail, takeoutCancelledEmail } from '@/lib/email/templates';
import { rateLimit } from '@/lib/rate-limit';

function checkBookingRateLimit(): boolean {
  const ip = headers().get('x-forwarded-for') ?? 'local';
  return rateLimit(`booking:${ip}`, 10, 60_000).ok;
}

export interface BookingView {
  ok: boolean;
  kind?: 'reservation' | 'takeout';
  status?: string;
  code?: string;
  when?: string;
  partySize?: number;
  total?: number;
  canCancel?: boolean;
  message?: string;
}

export async function lookupBookingAction(token: string): Promise<BookingView> {
  if (!checkBookingRateLimit()) return { ok: false, message: 'アクセスが集中しています。少し時間をおいてお試しください。' };
  if (!token || token.length < 10) return { ok: false, message: 'リンクが正しくありません。' };
  if (useMockData) {
    return { ok: true, kind: 'reservation', status: 'confirmed', code: 'R-XXXX-XXXX', when: '（開発モック）', partySize: 2, canCancel: true };
  }
  const hash = hashToken(token);
  const sb = createSupabaseAdmin();

  const { data: r } = await sb.from('reservations')
    .select('reservation_code,service_date,start_at,party_size,status')
    .eq('cancel_token_hash', hash).maybeSingle();
  if (r) {
    return {
      ok: true, kind: 'reservation', status: r.status, code: r.reservation_code,
      when: `${r.service_date} ${new Date(r.start_at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}`,
      partySize: r.party_size, canCancel: r.status === 'confirmed',
    };
  }
  const { data: o } = await sb.from('takeout_orders')
    .select('order_code,pickup_at,total,status').eq('cancel_token_hash', hash).maybeSingle();
  if (o) {
    return {
      ok: true, kind: 'takeout', status: o.status, code: o.order_code,
      when: new Date(o.pickup_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      total: o.total, canCancel: o.status === 'received', // 調理開始(cooking)前のみ
    };
  }
  return { ok: false, message: 'ご予約が見つかりませんでした。' };
}

export async function cancelBookingAction(rawToken: string): Promise<{ ok: boolean; message: string }> {
  if (!checkBookingRateLimit()) return { ok: false, message: 'アクセスが集中しています。少し時間をおいてお試しください。' };
  const parsed = cancelInputSchema.safeParse({ token: rawToken });
  if (!parsed.success) return { ok: false, message: 'リンクが正しくありません。' };
  if (useMockData) return { ok: true, message: 'キャンセルしました（開発モック）。' };

  const hash = hashToken(parsed.data.token);
  const sb = createSupabaseAdmin();

  const { data: r } = await sb.from('reservations')
    .select('id,line_user_id,status,reservation_code,service_date,start_at,adult_count,child_count,pet_count,customer_name,phone,email,note')
    .eq('cancel_token_hash', hash).maybeSingle();
  if (r) {
    if (r.status !== 'confirmed') return { ok: false, message: 'この予約はキャンセルできません。' };
    await sb.from('reservations').update({ status: 'cancelled' }).eq('id', r.id);
    const when = `${r.service_date} ${new Date(r.start_at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}`;
    if (r.line_user_id) await notify({ to: r.line_user_id, messages: [{ type: 'text', text: `ご予約 ${r.reservation_code} をキャンセルしました。` }], targetType: 'reservation', targetId: r.id, kind: 'cancelled' });
    if (r.email) {
      const mail = reservationCancelledEmail({ customerName: r.customer_name, when, code: r.reservation_code });
      await sendEmail({ to: r.email, ...mail, targetType: 'reservation', targetId: r.id, kind: 'email_cancelled' });
    }
    if (env.lineStaffDestinationId) {
      await notify({
        to: env.lineStaffDestinationId,
        messages: [{
          type: 'text',
          text: staffReservationCancelNotice({
            cancelledAt: new Date(), when,
            adultCount: r.adult_count, childCount: r.child_count, petCount: r.pet_count,
            customerName: r.customer_name, phone: r.phone, code: r.reservation_code, note: r.note,
          }),
        }],
        targetType: 'reservation', targetId: r.id, kind: 'staff_cancelled',
      });
    }
    return { ok: true, message: 'ご予約をキャンセルしました。' };
  }

  const { data: o } = await sb.from('takeout_orders')
    .select('id,line_user_id,status,order_code,pickup_at,total,customer_name,phone,email,note')
    .eq('cancel_token_hash', hash).maybeSingle();
  if (o) {
    const settings = await loadSettings(); void settings;
    if (o.status !== 'received') return { ok: false, message: '調理開始後のためキャンセルできません。店舗へご連絡ください。' };
    await sb.from('takeout_orders').update({ status: 'cancelled' }).eq('id', o.id);
    const pickup = new Date(o.pickup_at).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    if (o.line_user_id) await notify({ to: o.line_user_id, messages: [{ type: 'text', text: `ご注文 ${o.order_code} をキャンセルしました。` }], targetType: 'takeout', targetId: o.id, kind: 'cancelled' });
    if (o.email) {
      const mail = takeoutCancelledEmail({ customerName: o.customer_name, pickup, code: o.order_code });
      await sendEmail({ to: o.email, ...mail, targetType: 'takeout', targetId: o.id, kind: 'email_cancelled' });
    }
    if (env.lineStaffDestinationId) {
      await notify({
        to: env.lineStaffDestinationId,
        messages: [{
          type: 'text',
          text: staffTakeoutCancelNotice({
            cancelledAt: new Date(), pickup, total: o.total,
            customerName: o.customer_name, phone: o.phone, code: o.order_code, note: o.note,
          }),
        }],
        targetType: 'takeout', targetId: o.id, kind: 'staff_cancelled',
      });
    }
    return { ok: true, message: 'ご注文をキャンセルしました。' };
  }
  return { ok: false, message: 'ご予約が見つかりませんでした。' };
}

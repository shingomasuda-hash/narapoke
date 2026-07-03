'use server';
/**
 * テイクアウト注文作成 Server Action。
 * サーバー側で: メニュー価格取得 → 選択ルール検証 → 売切確認 → 金額算定(整数円) →
 * 受取枠締切・営業日チェック → 原子的RPC(受取枠上限) → 通知。
 */
import { headers } from 'next/headers';
import { takeoutInputSchema, type TakeoutInput } from '@/lib/schemas';
import { toFriendly } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limit';
import { loadSettings } from '@/lib/settings';
import { loadCatalog } from '@/lib/catalog';
import { PLAN_RULES, validatePlanSelection, validatePokeDrinkSelection, calcThirdFruitSurcharge } from '@/lib/menu-rules';
import { calcOrderTotals, type PriceLine } from '@/lib/pricing';
import { parseTimeToMinutes, jstInstant, isThursday, isWithinOpenWindows } from '@/lib/time';
import { generateOrderCode, generateCancelToken, hashToken } from '@/lib/codes';
import { normalizePhone, isValidJpPhone } from '@/lib/phone';
import { verifyLineIdToken } from '@/lib/line/verify';
import { notify } from '@/lib/line/client';
import { takeoutFlex } from '@/lib/line/flex';
import { useMockData, env } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export interface TakeoutResult {
  ok: boolean;
  code?: string;
  token?: string;
  totals?: { subtotal: number; tax: number; total: number };
  errorCode?: string;
  message?: string;
}

export async function createTakeoutAction(raw: TakeoutInput): Promise<TakeoutResult> {
  const parsed = takeoutInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errorCode: 'INVALID', message: parsed.error.errors[0]?.message ?? toFriendly('INVALID') };
  }
  const input = parsed.data;

  const ip = headers().get('x-forwarded-for') ?? 'local';
  if (!rateLimit(`takeout:${ip}`, 8, 60_000).ok) {
    return { ok: false, errorCode: 'UNKNOWN', message: 'アクセスが集中しています。少し時間をおいてお試しください。' };
  }

  const settings = await loadSettings();
  const phone = normalizePhone(input.phone);
  if (!isValidJpPhone(phone)) {
    return { ok: false, errorCode: 'INVALID', message: '電話番号の形式が正しくありません。' };
  }

  // 受取日時の営業日/締切チェック
  if (isThursday(input.pickupDate)) {
    return { ok: false, errorCode: 'THURSDAY', message: toFriendly('THURSDAY') };
  }
  const pickMin = parseTimeToMinutes(input.pickupTime);
  if (!isWithinOpenWindows(pickMin)) {
    return { ok: false, errorCode: 'OUT_OF_HOURS', message: toFriendly('OUT_OF_HOURS') };
  }
  const pickupAt = jstInstant(input.pickupDate, pickMin);
  const cutoff = new Date(pickupAt.getTime() - settings.takeoutCutoffMinutes * 60_000);
  if (Date.now() >= cutoff.getTime()) {
    return { ok: false, errorCode: 'PAST_CUTOFF', message: '受取時間の締切を過ぎています。別の時間をお選びください。' };
  }

  // メニュー取得＆金額算定（サーバー権威）
  const { items, options } = await loadCatalog();
  const priceLines: PriceLine[] = [];
  const itemSnapshots: Record<string, unknown>[] = [];

  for (const line of input.items) {
    const item = items.get(line.itemCode);
    if (!item) return { ok: false, errorCode: 'INVALID', message: '存在しない商品が含まれています。' };
    if (item.soldOut) return { ok: false, errorCode: 'SOLD_OUT', message: `「${item.name}」は売り切れです。` };

    let optionsDelta = 0;
    const sel = line.selections ?? {};

    // プランのメイン/サブ選択数検証
    if (item.code.startsWith('plan_')) {
      const planCode = item.code.replace('plan_', '').toUpperCase();
      const mains = sel.mains ?? [];
      const subs = sel.subs ?? [];
      const v = validatePlanSelection(planCode, mains, subs);
      if (!v.ok) return { ok: false, errorCode: 'INVALID', message: v.errors[0] };
      void PLAN_RULES; // 参照（必須数は menu-rules 側で管理）
    }

    // ならポケドリンクの選択ルール検証
    const isPokeDrink = item.code === 'poke_drink_single';
    if (isPokeDrink) {
      const v = validatePokeDrinkSelection(sel.fruits ?? [], sel.vegetables ?? []);
      if (!v.ok) return { ok: false, errorCode: 'INVALID', message: v.errors[0] };
      // 3種類目フルーツのみ加算（基本の2フルーツ+2野菜は 850 円に含む）。
      optionsDelta += calcThirdFruitSurcharge(sel.fruits ?? []);
    }

    // 選択された全オプションの追加料金を合算（売切確認込み）。
    // ポケドリンクの fruits/vegetables は基本料金に含むため個別加算しない
    // （3種目加算のみ上で計算済み。toppings 等の真の追加は下で加算）。
    for (const [groupKey, codes] of Object.entries(sel)) {
      if (isPokeDrink && (groupKey === 'fruits' || groupKey === 'vegetables')) continue;
      for (const code of codes) {
        const opt = options.get(code);
        if (!opt) continue;
        if (opt.soldOut) return { ok: false, errorCode: 'SOLD_OUT', message: `「${opt.name}」は売り切れです。` };
        optionsDelta += opt.extraPrice;
      }
    }

    // セット割（ポケ + 通常ドリンク同時注文時など）: 明示フラグで適用
    if (sel.setDiscount?.includes('yes') && item.setDiscount) {
      optionsDelta += item.setDiscount;
    }

    priceLines.push({ name: item.name, unitPrice: item.price, optionsDelta, quantity: line.quantity });
    itemSnapshots.push({
      menu_item_id: '', item_code: item.code, item_name: item.name,
      unit_price: item.price, options_delta: optionsDelta, quantity: line.quantity,
      line_subtotal: (item.price + optionsDelta) * line.quantity, selections: sel,
    });
  }

  const totals = calcOrderTotals(priceLines, settings.takeoutTaxRatePercent, 'floor');

  // LINE 検証
  let lineUserId: string | null = null;
  if (input.lineIdToken) {
    const v = await verifyLineIdToken(input.lineIdToken);
    if (v.ok) lineUserId = v.userId ?? null;
  }

  const code = generateOrderCode();
  const token = generateCancelToken();
  const tokenHash = hashToken(token);

  if (useMockData) {
    console.info('[MOCK] テイクアウト注文', { code, totals, pickup: `${input.pickupDate} ${input.pickupTime}` });
    return { ok: true, code, token, totals };
  }

  try {
    const sb = createSupabaseAdmin();
    const { data, error } = await sb.rpc('create_takeout_order', {
      p_pickup_at: pickupAt.toISOString(),
      p_service_date: input.pickupDate,
      p_customer_name: input.customerName,
      p_phone: phone,
      p_email: input.email || null,
      p_line_user_id: lineUserId,
      p_note: input.note || null,
      p_allergy: input.allergy || null,
      p_subtotal: totals.subtotal,
      p_tax: totals.tax,
      p_total: totals.total,
      p_tax_rate_percent: settings.takeoutTaxRatePercent,
      p_order_code: code,
      p_cancel_token_hash: tokenHash,
      p_idempotency_key: input.idempotencyKey,
      p_items: JSON.stringify(itemSnapshots),
    });
    if (error) {
      const known = ['CLOSED', 'FULL'].find((c) => error.message.includes(c));
      return { ok: false, errorCode: known ?? 'UNKNOWN', message: toFriendly(known) };
    }
    const row = data as { id: string; order_code: string };
    const pickupLabel = `${input.pickupDate} ${input.pickupTime}`;
    if (lineUserId) {
      await notify({
        to: lineUserId,
        messages: [takeoutFlex({ code: row.order_code, pickup: pickupLabel, total: totals.total, token })],
        targetType: 'takeout', targetId: row.id, kind: 'created',
      });
    }
    if (env.lineStaffDestinationId) {
      await notify({
        to: env.lineStaffDestinationId,
        messages: [{ type: 'text', text: `【新規テイクアウト】${pickupLabel} 合計¥${totals.total.toLocaleString()} ${input.customerName}様 (${row.order_code})` }],
        targetType: 'takeout', targetId: row.id, kind: 'staff_created',
      });
    }
    return { ok: true, code: row.order_code, token, totals };
  } catch (e) {
    console.error('[takeout] 失敗', (e as Error).message);
    return { ok: false, errorCode: 'UNKNOWN', message: toFriendly('UNKNOWN') };
  }
}

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
import { loadCatalog, resolveAddon } from '@/lib/catalog';
import { validatePlanSelection, validateFruitVegSelection, validateSauceSelection, calcSubExcessFee, subExcessCount } from '@/lib/menu-rules';
import { calcOrderTotals, type PriceLine } from '@/lib/pricing';
import { formatOrderSummaryText, type OrderItemSnapshot } from '@/lib/order-format';
import { parseTimeToMinutes, jstInstant, isThursday, isWithinOpenWindows } from '@/lib/time';
import { generateOrderCode, generateCancelToken, hashToken } from '@/lib/codes';
import { normalizePhone, isValidJpPhone } from '@/lib/phone';
import { verifyLineIdToken } from '@/lib/line/verify';
import { notify } from '@/lib/line/client';
import { takeoutFlex, staffTakeoutNotice } from '@/lib/line/flex';
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
    let excessCount = 0;
    let excessFee = 0;

    // プランのメイン/サブ選択数検証 + ソース選択必須検証
    if (item.code.startsWith('plan_')) {
      const planCode = item.code.replace('plan_', '').toUpperCase();
      const mains = sel.mains ?? [];
      const subs = sel.subs ?? [];
      const v = validatePlanSelection(planCode, mains, subs);
      if (!v.ok) return { ok: false, errorCode: 'INVALID', message: v.errors[0] };
      const sv = validateSauceSelection(sel.sauce ?? []);
      if (!sv.ok) return { ok: false, errorCode: 'INVALID', message: sv.errors[0] };
      excessCount = subExcessCount(planCode, subs.length);
      excessFee = calcSubExcessFee(planCode, subs.length);
      optionsDelta += excessFee;
    }

    // ならポケドリンクの選択ルール検証（フルーツ・野菜あわせて3種類）
    if (item.code === 'poke_drink_single') {
      const v = validateFruitVegSelection(sel.fruitVeg ?? []);
      if (!v.ok) return { ok: false, errorCode: 'INVALID', message: v.errors[0] };
    }

    // 選択された全コードの追加料金を合算（売切確認込み）+ 表示名を解決（通知・管理画面用）。
    // メイン/選択サブは menu_items、それ以外は menu_options に由来するため
    // resolveAddon() が両テーブルから解決する（テーブルの違いによる加算漏れを防ぐ）。
    const optionLabels: Record<string, string[]> = {};
    for (const [groupKey, codes] of Object.entries(sel)) {
      const names: string[] = [];
      for (const code of codes) {
        const resolved = resolveAddon(code, items, options);
        if (!resolved) { names.push(code); continue; }
        if (resolved.soldOut) return { ok: false, errorCode: 'SOLD_OUT', message: `「${resolved.name}」は売り切れです。` };
        optionsDelta += resolved.extraPrice;
        names.push(resolved.name);
      }
      if (names.length > 0) optionLabels[groupKey] = names;
    }

    // セット割（ポケ + 通常ドリンク同時注文時など）: 明示フラグで適用
    if (sel.setDiscount?.includes('yes') && item.setDiscount) {
      optionsDelta += item.setDiscount;
    }

    const snapshotSelections: Record<string, unknown> = { ...sel, labels: optionLabels };
    if (excessCount > 0) {
      snapshotSelections.subExcessCount = excessCount;
      snapshotSelections.subExcessFee = excessFee;
    }

    priceLines.push({ name: item.name, unitPrice: item.price, optionsDelta, quantity: line.quantity });
    itemSnapshots.push({
      menu_item_id: '', item_code: item.code, item_name: item.name,
      unit_price: item.price, options_delta: optionsDelta, quantity: line.quantity,
      line_subtotal: (item.price + optionsDelta) * line.quantity, selections: snapshotSelections,
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
      p_items: itemSnapshots,
    });
    if (error) {
      const known = ['CLOSED', 'FULL'].find((c) => error.message.includes(c));
      return { ok: false, errorCode: known ?? 'UNKNOWN', message: toFriendly(known) };
    }
    const row = data as { id: string; order_code: string };
    const pickupLabel = `${input.pickupDate} ${input.pickupTime}`;
    const orderItems = itemSnapshots as unknown as OrderItemSnapshot[];
    if (lineUserId) {
      await notify({
        to: lineUserId,
        messages: [takeoutFlex({ code: row.order_code, pickup: pickupLabel, total: totals.total, token, items: orderItems })],
        targetType: 'takeout', targetId: row.id, kind: 'created',
      });
    }
    if (env.lineStaffDestinationId) {
      const summary = formatOrderSummaryText(orderItems);
      await notify({
        to: env.lineStaffDestinationId,
        messages: [{
          type: 'text',
          text: staffTakeoutNotice({
            createdAt: new Date(), code: row.order_code, pickup: pickupLabel, total: totals.total,
            customerName: input.customerName, phone, email: input.email, summary,
          }),
        }],
        targetType: 'takeout', targetId: row.id, kind: 'staff_created',
      });
    }
    return { ok: true, code: row.order_code, token, totals };
  } catch (e) {
    console.error('[takeout] 失敗', (e as Error).message);
    return { ok: false, errorCode: 'UNKNOWN', message: toFriendly('UNKNOWN') };
  }
}

/**
 * テイクアウト注文明細（takeout_order_items）を、管理画面・LINE通知の両方で
 * 人が読める文言に変換する共通ロジック。
 * selections には作成時点で解決済みの表示名（labels）をスナップショットしてあるため、
 * 表示側はメニューテーブルを再度参照しなくてよい。
 */

export const SELECTION_GROUP_LABELS: Record<string, string> = {
  mains: 'メイン',
  subs: 'サブ',
  sauce: 'ソース',
  fruitVeg: 'フルーツ・野菜',
  toppings: 'トッピング',
  planAddon: '追加オプション',
};

export interface OrderItemSnapshot {
  item_name: string;
  unit_price: number;
  options_delta: number;
  quantity: number;
  selections: Record<string, unknown> | null;
}

/** 選択内容（内訳）を「メイン: サーモン・タコ」のような行の配列にする。 */
export function describeSelections(selections: Record<string, unknown> | null | undefined): string[] {
  if (!selections) return [];
  const labels = (selections.labels ?? {}) as Record<string, string[]>;
  const lines: string[] = [];
  for (const [key, label] of Object.entries(SELECTION_GROUP_LABELS)) {
    const names = labels[key];
    if (names && names.length > 0) lines.push(`${label}: ${names.join('・')}`);
  }
  const excessCount = selections.subExcessCount as number | undefined;
  const excessFee = selections.subExcessFee as number | undefined;
  if (excessCount) lines.push(`サブ追加分 +${excessCount}点（+¥${excessFee}）`);
  return lines;
}

/** 明細1行分のテキスト（例: ・プランA（メイン: サーモン・タコ） ×1） */
export function formatOrderItemLine(item: OrderItemSnapshot): string {
  const detail = describeSelections(item.selections);
  return `・${item.item_name}${detail.length ? `（${detail.join(' / ')}）` : ''} ×${item.quantity}`;
}

/** 注文全体の明細テキスト（改行区切り）。LINE通知・管理画面の両方で使う。 */
export function formatOrderSummaryText(items: OrderItemSnapshot[]): string {
  return items.map(formatOrderItemLine).join('\n');
}

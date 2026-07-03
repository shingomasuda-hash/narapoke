/**
 * 金額計算（すべて整数の「円」で扱う。浮動小数点誤差を出さない）
 *
 * - メニュー価格は税込(tax-inclusive)で保持する。
 * - 税額はDB保存の税込合計から逆算して抽出する: tax = floor(total × rate / (100 + rate))
 * - 丸めは既定で切り捨て(floor)。店舗の会計方針に合わせて変更可能（README 参照）。
 * - 税率はコードに固定せず、引数(=DB/管理設定 由来)で受け取る。
 */

export type RoundingMode = 'floor' | 'round' | 'ceil';

/** taxRatePercent は整数％（例: 10, 8）。float を避けるため整数で計算する。 */
export function calcTax(
  subtotal: number,
  taxRatePercent: number,
  mode: RoundingMode = 'floor'
): number {
  if (!Number.isInteger(subtotal)) throw new Error('小計は整数円で渡してください');
  const raw = (subtotal * taxRatePercent) / 100; // subtotal, percent とも整数
  switch (mode) {
    case 'round':
      return Math.round(raw);
    case 'ceil':
      return Math.ceil(raw);
    default:
      return Math.floor(raw);
  }
}

export interface PriceLine {
  /** 表示名（スナップショット用） */
  name: string;
  /** 税込単価 */
  unitPrice: number;
  /** この明細に紐づく追加料金合計（税込, 例: トッピング・セット割引など。割引は負値） */
  optionsDelta: number;
  quantity: number;
}

/** 明細1行の税込金額。 */
export function lineSubtotal(line: PriceLine): number {
  return (line.unitPrice + line.optionsDelta) * line.quantity;
}

export interface OrderTotals {
  subtotal: number; // 税抜合計（税込合計から逆算）
  tax: number; // 税額
  total: number; // 税込合計
}

/** 注文全体の税込合計・税額・税抜小計を計算する（価格は税込で保持）。 */
export function calcOrderTotals(
  lines: PriceLine[],
  taxRatePercent: number,
  mode: RoundingMode = 'floor'
): OrderTotals {
  const total = lines.reduce((acc, l) => acc + lineSubtotal(l), 0);
  // 税込価格から税額を逆算: tax = total × rate / (100 + rate)
  const raw = (total * taxRatePercent) / (100 + taxRatePercent);
  const tax = mode === 'round' ? Math.round(raw) : mode === 'ceil' ? Math.ceil(raw) : Math.floor(raw);
  return { subtotal: total - tax, tax, total };
}

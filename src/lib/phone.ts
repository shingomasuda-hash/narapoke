/** 電話番号の正規化（日本国内前提。ハイフン・全角・空白を除去して数字のみに）。 */
export function normalizePhone(input: string): string {
  const half = input.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const digits = half.replace(/[^\d]/g, '');
  return digits;
}

export function isValidJpPhone(input: string): boolean {
  const d = normalizePhone(input);
  // 携帯(11桁) / 固定(10桁) をゆるく許容
  return /^0\d{9,10}$/.test(d);
}

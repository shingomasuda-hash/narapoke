import { describe, it, expect } from 'vitest';
import { calcTax, calcOrderTotals, lineSubtotal } from '@/lib/pricing';

describe('金額計算（整数円）', () => {
  it('税額は切り捨てで整数円になる', () => {
    expect(calcTax(1200, 10)).toBe(120);
    expect(calcTax(1380, 8)).toBe(110); // 110.4 -> 110
    expect(calcTax(1481, 10)).toBe(148); // 148.1 -> 148
  });

  it('明細金額 = (単価+追加料金)×数量', () => {
    expect(lineSubtotal({ name: 'x', unitPrice: 1200, optionsDelta: 250, quantity: 2 })).toBe(2900);
  });

  it('追加料金・セット割引を含む注文合計（税込価格から税額逆算）', () => {
    // line1: (1320+275)*1=1595, line2: (660-110)*2=1100 → total=2695
    // tax = floor(2695 * 10 / 110) = floor(245) = 245
    // subtotal = 2695 - 245 = 2450
    const t = calcOrderTotals([
      { name: 'プランA+イクラ', unitPrice: 1320, optionsDelta: 275, quantity: 1 },
      { name: 'ドリンク(セット割)', unitPrice: 660, optionsDelta: -110, quantity: 2 },
    ], 10);
    expect(t.total).toBe(2695);
    expect(t.tax).toBe(245);
    expect(t.subtotal).toBe(2450);
  });

  it('税率はコード固定でなく引数から適用される', () => {
    // 1100円（税込）at 8%: floor(1100 * 8 / 108) = floor(81.48) = 81
    // 1100円（税込）at 10%: floor(1100 * 10 / 110) = floor(100) = 100
    expect(calcOrderTotals([{ name: 'x', unitPrice: 1100, optionsDelta: 0, quantity: 1 }], 8).tax).toBe(81);
    expect(calcOrderTotals([{ name: 'x', unitPrice: 1100, optionsDelta: 0, quantity: 1 }], 10).tax).toBe(100);
  });
});

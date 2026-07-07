import { describe, it, expect } from 'vitest';
import {
  validatePlanSelection, calcSubExcessFee, subExcessCount,
  validateFruitVegSelection, validateSauceSelection,
} from '@/lib/menu-rules';

describe('メニュー選択ルール', () => {
  it('プランA〜Dのメインは必須数ちょうど、サブは必須数以上', () => {
    expect(validatePlanSelection('A', ['s', 't'], ['1', '2', '3']).ok).toBe(true);
    expect(validatePlanSelection('A', ['s'], ['1', '2', '3']).ok).toBe(false); // メイン不足
    expect(validatePlanSelection('A', ['s', 't'], ['1', '2']).ok).toBe(false); // サブ不足
    expect(validatePlanSelection('A', ['s', 't'], ['1', '2', '3', '4', '5']).ok).toBe(true); // サブ超過は許容
    expect(validatePlanSelection('B', ['s', 't'], ['1', '2', '3', '4']).ok).toBe(true);
    expect(validatePlanSelection('C', ['a', 'b', 'c'], ['1', '2', '3']).ok).toBe(true);
    expect(validatePlanSelection('D', ['a', 'b', 'c'], ['1', '2', '3', '4']).ok).toBe(true);
    expect(validatePlanSelection('D', ['a', 'b'], ['1', '2', '3', '4']).ok).toBe(false);
  });

  it('サブ超過分の追加料金は超過1つにつき100円', () => {
    expect(calcSubExcessFee('A', 3)).toBe(0); // ちょうど
    expect(calcSubExcessFee('A', 4)).toBe(100); // 1つ超過
    expect(calcSubExcessFee('A', 5)).toBe(200); // 2つ超過
    expect(subExcessCount('A', 5)).toBe(2);
    expect(subExcessCount('A', 3)).toBe(0);
  });

  it('ならポケドリンクはフルーツ・野菜あわせて3種類ちょうど', () => {
    expect(validateFruitVegSelection(['mango', 'ichigo', 'spinach']).ok).toBe(true);
    expect(validateFruitVegSelection(['mango', 'ichigo']).ok).toBe(false);
    expect(validateFruitVegSelection(['mango', 'ichigo', 'spinach', 'celery']).ok).toBe(false);
  });

  it('ソースは1つ選択必須', () => {
    expect(validateSauceSelection(['standard']).ok).toBe(true);
    expect(validateSauceSelection([]).ok).toBe(false);
    expect(validateSauceSelection(['standard', 'spicy']).ok).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { validatePlanSelection, validatePokeDrinkSelection, calcThirdFruitSurcharge } from '@/lib/menu-rules';

describe('メニュー選択ルール', () => {
  it('プランA〜Dのメイン/サブ選択数', () => {
    expect(validatePlanSelection('A', ['s', 't'], ['1', '2', '3']).ok).toBe(true);
    expect(validatePlanSelection('A', ['s'], ['1', '2', '3']).ok).toBe(false);
    expect(validatePlanSelection('B', ['s', 't'], ['1', '2', '3', '4']).ok).toBe(true);
    expect(validatePlanSelection('C', ['a', 'b', 'c'], ['1', '2', '3']).ok).toBe(true);
    expect(validatePlanSelection('D', ['a', 'b', 'c'], ['1', '2', '3', '4']).ok).toBe(true);
    expect(validatePlanSelection('D', ['a', 'b'], ['1', '2', '3', '4']).ok).toBe(false);
  });

  it('ならポケドリンクの選択ルール（2+2 / 3フルーツ+1野菜）', () => {
    expect(validatePokeDrinkSelection(['mango', 'ichigo'], ['spinach', 'celery']).ok).toBe(true);
    expect(validatePokeDrinkSelection(['mango', 'ichigo', 'ringo'], ['spinach']).ok).toBe(true);
    expect(validatePokeDrinkSelection(['a', 'b', 'c', 'd'], []).ok).toBe(false); // フルーツ4は不可
    expect(validatePokeDrinkSelection(['a', 'b'], ['x']).ok).toBe(false); // 合計3は不可
  });

  it('3種類目フルーツの追加料金', () => {
    expect(calcThirdFruitSurcharge(['mango', 'ichigo', 'ringo'])).toBe(80);
    expect(calcThirdFruitSurcharge(['mango', 'ichigo', 'grapefruit'])).toBe(150);
    expect(calcThirdFruitSurcharge(['mango', 'ichigo'])).toBe(0);
  });
});

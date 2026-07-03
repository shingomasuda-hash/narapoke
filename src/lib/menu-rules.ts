/**
 * メニュー選択ルールの検証（フロント/サーバー両方で使用）
 *
 * 重要: これらの検証はフロントの表示制御だけでなく、必ずサーバー側でも実行する。
 * 数量・追加料金の算定根拠を UI 表示に依存させない。
 */

/** ポケプランごとの必須選択数 */
export interface PlanRule {
  code: 'A' | 'B' | 'C' | 'D';
  name: string;
  basePrice: number; // 税込
  mainCount: number; // 必須メイン数
  subCount: number; // 必須（選択）サブ数
}

export const PLAN_RULES: Record<string, PlanRule> = {
  A: { code: 'A', name: 'プランA', basePrice: 1320, mainCount: 2, subCount: 3 },
  B: { code: 'B', name: 'プランB', basePrice: 1430, mainCount: 2, subCount: 4 },
  C: { code: 'C', name: 'プランC', basePrice: 1680, mainCount: 3, subCount: 3 },
  D: { code: 'D', name: 'プランD', basePrice: 1780, mainCount: 3, subCount: 4 },
};

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * プランのメイン/サブ選択数を厳密に検証する。
 * mains / subs は選択された ID の配列（重複可: 同じ具材を2つ等は仕様次第。ここでは要素数で判定）。
 */
export function validatePlanSelection(
  planCode: string,
  mains: string[],
  subs: string[]
): ValidationResult {
  const rule = PLAN_RULES[planCode];
  const errors: string[] = [];
  if (!rule) {
    return { ok: false, errors: [`不明なプランです: ${planCode}`] };
  }
  if (mains.length !== rule.mainCount) {
    errors.push(`${rule.name} のメインは${rule.mainCount}種類選んでください（現在 ${mains.length}種類）`);
  }
  if (subs.length !== rule.subCount) {
    errors.push(`${rule.name} のサブは${rule.subCount}種類選んでください（現在 ${subs.length}種類）`);
  }
  return { ok: errors.length === 0, errors };
}

/* ===== ならポケドリンクの選択ルール ===== */

/** フルーツ2 + 野菜2 = 4 種類を基本。フルーツは最大3種類。 */
export const POKE_DRINK_RULE = {
  baseTotal: 4,
  fruitMin: 2,
  fruitMax: 3,
} as const;

/**
 * 3種類目に選んだ場合のみ加算される追加料金（円, 税込）。
 * PDF 記載: りんご+80 / みかん+100 / キウイ+100、特選: パイン+80 / 柿+80 / グレープフルーツ+150。
 * ※ PDF 未確認のため README の要確認事項に記載。管理画面で変更可能。
 */
export const THIRD_FRUIT_SURCHARGE: Record<string, number> = {
  ringo: 80,
  mikan: 100,
  kiwi: 100,
  pine: 80,
  kaki: 80,
  grapefruit: 150,
};

export function validatePokeDrinkSelection(
  fruits: string[],
  vegetables: string[]
): ValidationResult {
  const errors: string[] = [];
  const f = fruits.length;
  const v = vegetables.length;
  if (f < POKE_DRINK_RULE.fruitMin) {
    errors.push(`フルーツは最低${POKE_DRINK_RULE.fruitMin}種類選んでください`);
  }
  if (f > POKE_DRINK_RULE.fruitMax) {
    errors.push(`フルーツは最大${POKE_DRINK_RULE.fruitMax}種類までです`);
  }
  if (f + v !== POKE_DRINK_RULE.baseTotal) {
    errors.push(`フルーツと野菜あわせて${POKE_DRINK_RULE.baseTotal}種類選んでください（現在 ${f + v}種類）`);
  }
  return { ok: errors.length === 0, errors };
}

/** 3種類目フルーツの追加料金合計（3種類選ばれている場合のみ、3番目の1種に対して加算）。 */
export function calcThirdFruitSurcharge(fruits: string[]): number {
  if (fruits.length < 3) return 0;
  const third = fruits[2];
  return THIRD_FRUIT_SURCHARGE[third] ?? 0;
}

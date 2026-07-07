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
  basePrice: number; // 税込（参考値。実際の課金額は menu_items.price を権威とする）
  mainCount: number; // 必須メイン数
  subCount: number; // 最低限必要なサブ数（これを超えた分は1つにつき SUB_EXCESS_FEE_PER_ITEM を加算）
}

export const PLAN_RULES: Record<string, PlanRule> = {
  A: { code: 'A', name: 'プランA', basePrice: 1320, mainCount: 2, subCount: 3 },
  B: { code: 'B', name: 'プランB', basePrice: 1430, mainCount: 2, subCount: 4 },
  C: { code: 'C', name: 'プランC', basePrice: 1680, mainCount: 3, subCount: 3 },
  D: { code: 'D', name: 'プランD', basePrice: 1780, mainCount: 3, subCount: 4 },
};

/** サブトッピングが選択可能数を超えた場合の、超過1つあたりの追加料金（税込）。 */
export const SUB_EXCESS_FEE_PER_ITEM = 100;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * プランのメイン/サブ選択数を検証する。
 * - メインは必ず mainCount 種類ちょうど。
 * - サブは subCount 種類以上（超過分は許容し、料金は calcSubExcessFee で別途加算する）。
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
  if (subs.length < rule.subCount) {
    errors.push(`${rule.name} のサブは${rule.subCount}種類以上選んでください（現在 ${subs.length}種類）`);
  }
  return { ok: errors.length === 0, errors };
}

/** サブの選択超過数に応じた追加料金（税込）。超過がなければ 0。 */
export function calcSubExcessFee(planCode: string, subsLength: number): number {
  const rule = PLAN_RULES[planCode];
  if (!rule) return 0;
  const excess = Math.max(0, subsLength - rule.subCount);
  return excess * SUB_EXCESS_FEE_PER_ITEM;
}

export function subExcessCount(planCode: string, subsLength: number): number {
  const rule = PLAN_RULES[planCode];
  if (!rule) return 0;
  return Math.max(0, subsLength - rule.subCount);
}

/* ===== ならポケドリンクの選択ルール ===== */

/** フルーツ・野菜をあわせて必ず3種類選択する（各アイテムの追加料金は menu_options 側で管理）。 */
export const FRUIT_VEG_TOTAL = 3;

export function validateFruitVegSelection(codes: string[]): ValidationResult {
  const errors: string[] = [];
  if (codes.length !== FRUIT_VEG_TOTAL) {
    errors.push(`フルーツ・野菜はあわせて${FRUIT_VEG_TOTAL}種類選んでください（現在 ${codes.length}種類）`);
  }
  return { ok: errors.length === 0, errors };
}

/* ===== プラン共通: ソース選択 ===== */

export function validateSauceSelection(codes: string[]): ValidationResult {
  const errors: string[] = [];
  if (codes.length !== 1) {
    errors.push('ソースを1つ選んでください');
  }
  return { ok: errors.length === 0, errors };
}

/**
 * メニューカタログ（価格の権威はサーバー側）。
 * - 本番: DB(menu_items/menu_options) から読み込む。
 * - 開発モック: seed と整合する固定カタログを使う。
 * 追加料金・割引はここ（=サーバー）で算定し、フロントの表示金額は信用しない。
 *
 * 注意: メイン/選択サブは menu_items（price列）としてDBに存在し、
 * フルーツ・野菜・トッピング・ソース・プラン追加オプションは menu_options
 * （extra_price列）としてDBに存在する。選択コードがどちらのテーブル由来か
 * 呼び出し側で区別する必要がないよう、resolveAddon() で両方から解決する。
 */
import { useMockData } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { PLAN_RULES } from '@/lib/menu-rules';

export interface CatalogItem {
  code: string;
  name: string;
  price: number; // 税込
  soldOut: boolean;
  setDiscount?: number; // 通常ドリンク/ポケのセット割
  meta?: Record<string, unknown>;
}
export interface CatalogOption {
  code: string;
  name: string;
  extraPrice: number;
  soldOut: boolean;
}

// ---- 開発モック用の固定カタログ（seed と一致） -------------------
const MOCK_ITEMS: CatalogItem[] = [
  { code: 'plan_a', name: 'プランA', price: 1320, soldOut: false, meta: { mainCount: 2, subCount: 3 } },
  { code: 'plan_b', name: 'プランB', price: 1430, soldOut: false, meta: { mainCount: 2, subCount: 4 } },
  { code: 'plan_c', name: 'プランC', price: 1680, soldOut: false, meta: { mainCount: 3, subCount: 3 } },
  { code: 'plan_d', name: 'プランD', price: 1780, soldOut: false, meta: { mainCount: 3, subCount: 4 } },
  { code: 'poke_drink_single', name: 'ならポケドリンク', price: 850, soldOut: false, setDiscount: -100 },
  { code: 'drink_coffee', name: 'コーヒー Hot/Ice', price: 600, soldOut: false, setDiscount: -100 },
  { code: 'drink_americano', name: 'アメリカーノ', price: 680, soldOut: false, setDiscount: -100 },
  { code: 'drink_latte', name: 'ラテ Hot/Ice', price: 680, soldOut: false, setDiscount: -100 },
  { code: 'drink_matcha_latte', name: '抹茶ラテ', price: 680, soldOut: false, setDiscount: -100 },
  { code: 'drink_cocoa', name: 'ココア', price: 680, soldOut: false, setDiscount: -100 },
  { code: 'drink_ice_tea_soda', name: 'アイスティーソーダ', price: 600, soldOut: false, setDiscount: -100 },
  { code: 'drink_cola', name: 'コーラ', price: 550, soldOut: false, setDiscount: -100 },
  { code: 'drink_ginger_ale', name: 'ジンジャーエール', price: 550, soldOut: false, setDiscount: -100 },
  { code: 'drink_orange', name: 'オレンジ', price: 550, soldOut: false, setDiscount: -100 },
  { code: 'drink_apple_juice', name: 'りんごジュース', price: 550, soldOut: false, setDiscount: -100 },
  { code: 'sweets_acai', name: 'アサイー', price: 980, soldOut: false },
  { code: 'sweets_marshmallow', name: 'マシュマロドリンク', price: 980, soldOut: false },
  { code: 'sweets_imo_brulee', name: '芋ブリュレ', price: 920, soldOut: false },
  { code: 'sweets_oreo_shake', name: 'オレオシェイク', price: 850, soldOut: false },
  { code: 'sweets_honey', name: 'はちみつ', price: 50, soldOut: false },
  // メイン（プラン注文内の選択用。price列＝追加料金として扱う）
  { code: 'main_salmon', name: 'サーモン', price: 0, soldOut: false },
  { code: 'main_tako', name: 'タコ', price: 0, soldOut: false },
  { code: 'main_maguro', name: 'マグロ', price: 0, soldOut: false },
  { code: 'main_negitoro', name: 'ネギトロ', price: 0, soldOut: false },
  { code: 'main_ikura', name: 'イクラ', price: 250, soldOut: false },
  { code: 'main_ebi', name: 'エビ', price: 250, soldOut: false },
  // 選択サブ（韓国海苔は追加料金を廃止）
  { code: 'subc_tomato', name: 'トマト', price: 0, soldOut: false },
  { code: 'subc_edamame', name: '枝豆', price: 0, soldOut: false },
  { code: 'subc_tuna', name: 'ツナ', price: 0, soldOut: false },
  { code: 'subc_nuts', name: 'ナッツ', price: 0, soldOut: false },
  { code: 'subc_lettuce', name: 'サニーレタス', price: 0, soldOut: false },
  { code: 'subc_friedonion', name: 'フライドオニオン', price: 0, soldOut: false },
  { code: 'subc_creamcheese', name: 'クリームチーズ', price: 0, soldOut: false },
  { code: 'subc_gomawakame', name: 'ごまわかめ', price: 0, soldOut: false },
  { code: 'subc_paprika', name: 'パプリカ', price: 0, soldOut: false },
  { code: 'subc_corn', name: 'コーン', price: 0, soldOut: false },
  { code: 'subc_tobikko', name: 'とびっこ', price: 0, soldOut: false },
  { code: 'subc_avocado', name: 'アボカド', price: 0, soldOut: false },
  { code: 'subc_takuan', name: 'たくあん', price: 0, soldOut: false },
  { code: 'subc_kannori', name: '韓国海苔', price: 0, soldOut: false },
];

const MOCK_OPTIONS: Record<string, CatalogOption> = {
  // ならポケドリンク: フルーツ・野菜（合計3種選択、特選のみ加算）
  mango: { code: 'mango', name: 'マンゴー', extraPrice: 0, soldOut: false },
  ichigo: { code: 'ichigo', name: 'いちご', extraPrice: 0, soldOut: false },
  blueberry: { code: 'blueberry', name: 'ブルーベリー', extraPrice: 0, soldOut: false },
  banana: { code: 'banana', name: 'バナナ', extraPrice: 0, soldOut: false },
  ringo: { code: 'ringo', name: 'りんご', extraPrice: 0, soldOut: false },
  mikan: { code: 'mikan', name: 'みかん', extraPrice: 0, soldOut: false },
  kiwi: { code: 'kiwi', name: 'キウイ', extraPrice: 0, soldOut: false },
  pine: { code: 'pine', name: 'パイン(特選)', extraPrice: 80, soldOut: false },
  kaki: { code: 'kaki', name: '柿(特選)', extraPrice: 80, soldOut: false },
  grapefruit: { code: 'grapefruit', name: 'グレープフルーツ(特選)', extraPrice: 150, soldOut: false },
  spinach: { code: 'spinach', name: 'ほうれん草', extraPrice: 0, soldOut: false },
  celery: { code: 'celery', name: 'セロリ', extraPrice: 0, soldOut: false },
  basil: { code: 'basil', name: 'バジル', extraPrice: 0, soldOut: false },
  komatsuna: { code: 'komatsuna', name: '小松菜', extraPrice: 0, soldOut: false },
  // 追加トッピング
  yogurt: { code: 'yogurt', name: 'ヨーグルト', extraPrice: 100, soldOut: false },
  honey: { code: 'honey', name: 'はちみつ', extraPrice: 100, soldOut: false },
  natadecoco: { code: 'natadecoco', name: 'ナタデココ', extraPrice: 100, soldOut: false },
  tapioca: { code: 'tapioca', name: 'タピオカ', extraPrice: 100, soldOut: false },
  // プラン共通: ソース選択（価格差なし）
  standard: { code: 'standard', name: 'スタンダード（韓国風）', extraPrice: 0, soldOut: false },
  spicy: { code: 'spicy', name: 'スパイシー（ピリ辛）', extraPrice: 0, soldOut: false },
  // プラン共通: 追加オプション
  rice_large: { code: 'rice_large', name: 'ご飯大盛り', extraPrice: 150, soldOut: false },
  egg_yolk: { code: 'egg_yolk', name: '卵黄', extraPrice: 150, soldOut: false },
};

export async function loadCatalog(): Promise<{
  items: Map<string, CatalogItem>;
  options: Map<string, CatalogOption>;
}> {
  if (useMockData) {
    return {
      items: new Map(MOCK_ITEMS.map((i) => [i.code, i])),
      options: new Map(Object.values(MOCK_OPTIONS).map((o) => [o.code, o])),
    };
  }
  const sb = createSupabaseAdmin();
  const [{ data: items }, { data: opts }] = await Promise.all([
    sb.from('menu_items').select('code,name,price,is_sold_out,is_published,meta'),
    sb.from('menu_options').select('code,name,extra_price,is_sold_out,is_published'),
  ]);
  const itemMap = new Map<string, CatalogItem>();
  for (const i of items ?? []) {
    if (!i.is_published) continue;
    itemMap.set(i.code, {
      code: i.code, name: i.name, price: i.price, soldOut: i.is_sold_out,
      setDiscount: (i.meta as { setDiscount?: number })?.setDiscount,
      meta: i.meta as Record<string, unknown>,
    });
  }
  const optMap = new Map<string, CatalogOption>();
  for (const o of opts ?? []) {
    if (!o.is_published) continue;
    optMap.set(o.code, { code: o.code, name: o.name, extraPrice: o.extra_price, soldOut: o.is_sold_out });
  }
  return { items: itemMap, options: optMap };
}

/**
 * 選択コード(例: メイン/選択サブ/フルーツ/トッピング等)の追加料金を解決する。
 * メイン・選択サブは menu_items（price）、それ以外は menu_options（extra_price）
 * に由来するため、呼び出し側がテーブルの違いを意識しなくてよいようにする。
 */
export function resolveAddon(
  code: string,
  items: Map<string, CatalogItem>,
  options: Map<string, CatalogOption>
): { name: string; extraPrice: number; soldOut: boolean } | undefined {
  const opt = options.get(code);
  if (opt) return { name: opt.name, extraPrice: opt.extraPrice, soldOut: opt.soldOut };
  const item = items.get(code);
  if (item) return { name: item.name, extraPrice: item.price, soldOut: item.soldOut };
  return undefined;
}

export { PLAN_RULES };

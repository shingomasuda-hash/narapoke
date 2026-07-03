/**
 * メニューカタログ（価格の権威はサーバー側）。
 * - 本番: DB(menu_items/menu_options) から読み込む。
 * - 開発モック: seed と整合する固定カタログを使う。
 * 追加料金・割引はここ（=サーバー）で算定し、フロントの表示金額は信用しない。
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
];

const MOCK_OPTIONS: Record<string, CatalogOption> = {
  main_ikura: { code: 'main_ikura', name: 'イクラ', extraPrice: 250, soldOut: false },
  main_ebi: { code: 'main_ebi', name: 'エビ', extraPrice: 250, soldOut: false },
  subc_kannori: { code: 'subc_kannori', name: '韓国海苔', extraPrice: 100, soldOut: false },
  ringo: { code: 'ringo', name: 'りんご', extraPrice: 80, soldOut: false },
  mikan: { code: 'mikan', name: 'みかん', extraPrice: 100, soldOut: false },
  kiwi: { code: 'kiwi', name: 'キウイ', extraPrice: 100, soldOut: false },
  grapefruit: { code: 'grapefruit', name: 'グレープフルーツ', extraPrice: 150, soldOut: false },
  pine: { code: 'pine', name: 'パイン', extraPrice: 80, soldOut: false },
  kaki: { code: 'kaki', name: '柿', extraPrice: 80, soldOut: false },
  yogurt: { code: 'yogurt', name: 'ヨーグルト', extraPrice: 100, soldOut: false },
  honey: { code: 'honey', name: 'はちみつ', extraPrice: 100, soldOut: false },
  natadecoco: { code: 'natadecoco', name: 'ナタデココ', extraPrice: 100, soldOut: false },
  tapioca: { code: 'tapioca', name: 'タピオカ', extraPrice: 100, soldOut: false },
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

export { PLAN_RULES };

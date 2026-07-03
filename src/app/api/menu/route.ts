/** 公開メニュー取得（税込価格・オプション）。非個人情報。 */
import { NextResponse } from 'next/server';
import { useMockData } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const MOCK = {
  categories: [
    { code: 'plan', name: 'ポケプラン' },
    { code: 'poke_drink', name: 'ならポケドリンク' },
    { code: 'drink', name: '通常ドリンク' },
    { code: 'sweets', name: 'スイーツ' },
  ],
  items: [
    { code: 'plan_a', category: 'plan', name: 'プランA', price: 1320, soldOut: false, meta: { mainCount: 2, subCount: 3 } },
    { code: 'plan_b', category: 'plan', name: 'プランB', price: 1430, soldOut: false, meta: { mainCount: 2, subCount: 4 } },
    { code: 'plan_c', category: 'plan', name: 'プランC', price: 1680, soldOut: false, meta: { mainCount: 3, subCount: 3 } },
    { code: 'plan_d', category: 'plan', name: 'プランD', price: 1780, soldOut: false, meta: { mainCount: 3, subCount: 4 } },
    { code: 'poke_drink_single', category: 'poke_drink', name: 'ならポケドリンク', price: 850, soldOut: false, meta: {} },
    { code: 'drink_coffee', category: 'drink', name: 'コーヒー Hot/Ice', price: 600, soldOut: false, meta: {} },
    { code: 'drink_americano', category: 'drink', name: 'アメリカーノ', price: 680, soldOut: false, meta: {} },
    { code: 'drink_latte', category: 'drink', name: 'ラテ Hot/Ice', price: 680, soldOut: false, meta: {} },
    { code: 'drink_matcha_latte', category: 'drink', name: '抹茶ラテ', price: 680, soldOut: false, meta: {} },
    { code: 'drink_cocoa', category: 'drink', name: 'ココア', price: 680, soldOut: false, meta: {} },
    { code: 'drink_ice_tea_soda', category: 'drink', name: 'アイスティーソーダ', price: 600, soldOut: false, meta: {} },
    { code: 'drink_cola', category: 'drink', name: 'コーラ', price: 550, soldOut: false, meta: {} },
    { code: 'drink_ginger_ale', category: 'drink', name: 'ジンジャーエール', price: 550, soldOut: false, meta: {} },
    { code: 'drink_orange', category: 'drink', name: 'オレンジ', price: 550, soldOut: false, meta: {} },
    { code: 'drink_apple_juice', category: 'drink', name: 'りんごジュース', price: 550, soldOut: false, meta: {} },
    { code: 'sweets_acai', category: 'sweets', name: 'アサイー', price: 980, soldOut: false, meta: {} },
    { code: 'sweets_marshmallow', category: 'sweets', name: 'マシュマロドリンク', price: 980, soldOut: false, meta: {} },
    { code: 'sweets_imo_brulee', category: 'sweets', name: '芋ブリュレ', price: 920, soldOut: false, meta: {} },
    { code: 'sweets_oreo_shake', category: 'sweets', name: 'オレオシェイク', price: 850, soldOut: false, meta: {} },
    { code: 'sweets_honey', category: 'sweets', name: 'はちみつ', price: 50, soldOut: false, meta: {} },
  ],
  mains: [
    { code: 'main_salmon', name: 'サーモン', extra: 0 }, { code: 'main_tako', name: 'タコ', extra: 0 },
    { code: 'main_maguro', name: 'マグロ', extra: 0 }, { code: 'main_negitoro', name: 'ネギトロ', extra: 0 },
    { code: 'main_ikura', name: 'イクラ', extra: 250 }, { code: 'main_ebi', name: 'エビ', extra: 250 },
  ],
  subs: [
    { code: 'subc_tomato', name: 'トマト', extra: 0 }, { code: 'subc_edamame', name: '枝豆', extra: 0 },
    { code: 'subc_tuna', name: 'ツナ', extra: 0 }, { code: 'subc_avocado', name: 'アボカド', extra: 0 },
    { code: 'subc_corn', name: 'コーン', extra: 0 }, { code: 'subc_kannori', name: '韓国海苔', extra: 100 },
  ],
};

export async function GET() {
  if (useMockData) return NextResponse.json(MOCK);
  try {
    const sb = createSupabaseAdmin();
    const [{ data: cats }, { data: items }, { data: opts }] = await Promise.all([
      sb.from('menu_categories').select('code,name,sort_order').eq('is_published', true).order('sort_order'),
      sb.from('menu_items').select('code,name,price,is_sold_out,meta,sort_order,menu_categories(code)').eq('is_published', true).order('sort_order'),
      sb.from('menu_options').select('code,name,extra_price,menu_option_groups(code)'),
    ]);
    const mapped = (items ?? []).map((i) => ({
      code: i.code, name: i.name, price: i.price, soldOut: i.is_sold_out,
      // @ts-expect-error join shape
      category: i.menu_categories?.code as string, meta: i.meta,
    }));
    // 顧客向けカタログ: 単品として並べるのは plan / poke_drink / drink / sweets のみ。
    const displayCats = new Set(['plan', 'poke_drink', 'drink', 'sweets']);
    return NextResponse.json({
      categories: (cats ?? []).map((c) => ({ code: c.code, name: c.name })).filter((c) => displayCats.has(c.code)),
      items: mapped.filter((i) => displayCats.has(i.category)),
      mains: mapped.filter((i) => i.category === 'main').map((i) => ({ code: i.code, name: i.name, extra: i.price })),
      subs: mapped.filter((i) => i.category === 'sub_choice').map((i) => ({ code: i.code, name: i.name, extra: i.price })),
      void: opts?.length ?? 0,
    });
  } catch {
    return NextResponse.json(MOCK);
  }
}

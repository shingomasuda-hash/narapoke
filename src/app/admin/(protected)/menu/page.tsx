import { loadMenuAdmin } from '@/lib/admin-data';
import { MenuControls } from '../StatusButtons';

export const dynamic = 'force-dynamic';

export default async function AdminMenu() {
  const items = await loadMenuAdmin();
  const categories: string[] = [];
  const byCategory = new Map<string, typeof items>();
  for (const it of items) {
    const key = it.category || '未分類';
    if (!byCategory.has(key)) { byCategory.set(key, []); categories.push(key); }
    byCategory.get(key)!.push(it);
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-xl font-bold text-sumi">メニュー管理</h1>
        <p className="text-sm text-sumi-soft">価格（税込）・売切・公開/非公開をカテゴリ別に変更できます。過去の注文金額は変わりません。</p>
      </div>
      {categories.map((cat) => (
        <section key={cat} className="space-y-2">
          <h2 className="font-serif text-lg font-bold text-sumi">{cat}</h2>
          {byCategory.get(cat)!.map((it) => (
            <div key={it.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <div><p className="font-semibold text-sumi">{it.name}</p><p className="text-xs text-sumi-soft">{it.code}</p></div>
              </div>
              <MenuControls id={it.id} price={it.price} soldOut={it.is_sold_out} published={it.is_published} />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

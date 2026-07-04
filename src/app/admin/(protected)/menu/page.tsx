import { loadMenuAdmin } from '@/lib/admin-data';
import { MenuControls } from '../StatusButtons';

export const dynamic = 'force-dynamic';

export default async function AdminMenu() {
  const items = await loadMenuAdmin();
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-xl font-bold text-sumi">メニュー管理</h1>
      <p className="text-sm text-sumi-soft">価格（税込）・売切・公開/非公開を変更できます。過去の注文金額は変わりません。</p>
      {items.map((it) => (
        <div key={it.id} className="card space-y-2">
          <div className="flex items-center justify-between">
            <div><p className="font-semibold text-sumi">{it.name}</p><p className="text-xs text-sumi-soft">{it.category} / {it.code}</p></div>
          </div>
          <MenuControls id={it.id} price={it.price} soldOut={it.is_sold_out} published={it.is_published} />
        </div>
      ))}
    </div>
  );
}

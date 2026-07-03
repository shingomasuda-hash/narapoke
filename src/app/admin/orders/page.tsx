import { loadTodayOrders } from '@/lib/admin-data';
import { OrderStatus } from '../StatusButtons';

export const dynamic = 'force-dynamic';

export default async function AdminOrders() {
  const list = await loadTodayOrders();
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-xl font-bold text-sumi">本日のテイクアウト注文</h1>
      {list.length === 0 && <p className="text-sumi-soft">本日の注文はありません。</p>}
      {list.map((o) => (
        <div key={o.id} className="card space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sumi">受取 {new Date(o.pickup_at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}</span>
            <span className="text-xs text-sumi-soft">{o.order_code}</span>
          </div>
          <p className="text-sm">{o.customer_name}様 / <a href={`tel:${o.phone}`} className="text-shu underline">{o.phone}</a></p>
          <p className="text-sm font-semibold">合計 ¥{o.total.toLocaleString()}（店舗支払い）</p>
          <OrderStatus id={o.id} status={o.status} />
        </div>
      ))}
    </div>
  );
}

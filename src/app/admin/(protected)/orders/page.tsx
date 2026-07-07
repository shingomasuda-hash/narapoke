import { loadTodayOrders } from '@/lib/admin-data';
import { OrderCard } from '../OrderCard';

export const dynamic = 'force-dynamic';

export default async function AdminOrders() {
  const list = await loadTodayOrders();
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-xl font-bold text-sumi">本日のテイクアウト注文</h1>
      {list.length === 0 && <p className="text-sumi-soft">本日の注文はありません。</p>}
      {list.map((o) => <OrderCard key={o.id} o={o} />)}
    </div>
  );
}

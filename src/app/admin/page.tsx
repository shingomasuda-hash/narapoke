import Link from 'next/link';
import { loadDashboard } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const d = await loadDashboard();
  const cards = [
    { label: '本日の席予約', value: `${d.reservationCount}件`, href: '/admin/reservations' },
    { label: '本日の来店人数', value: `${d.guests}名`, href: '/admin/reservations' },
    { label: '本日のテイクアウト', value: `${d.orderCount}件`, href: '/admin/orders' },
    { label: '本日の売上(税込)', value: `¥${d.revenue.toLocaleString()}`, href: '/admin/orders' },
  ];
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-xl font-bold text-sumi">ダッシュボード（{d.date}）</h1>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card">
            <p className="text-sm text-sumi-soft">{c.label}</p>
            <p className="mt-1 font-serif text-2xl font-bold text-shu">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

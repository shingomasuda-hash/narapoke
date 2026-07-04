import Link from 'next/link';
import { loadDashboard, loadReservationsForDate, todayJst } from '@/lib/admin-data';
import { DateNav } from './DateNav';
import { ReservationCard } from './ReservationCard';

export const dynamic = 'force-dynamic';

function normalizeDate(raw: string | undefined): string {
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayJst();
}

export default async function Dashboard({ searchParams }: { searchParams: { date?: string } }) {
  const date = normalizeDate(searchParams.date);
  const [d, list] = await Promise.all([loadDashboard(date), loadReservationsForDate(date)]);
  const cards = [
    { label: '席予約', value: `${d.reservationCount}件`, href: `/admin/reservations?date=${date}` },
    { label: '来店人数', value: `${d.guests}名`, href: `/admin/reservations?date=${date}` },
    { label: 'テイクアウト', value: `${d.orderCount}件`, href: '/admin/orders' },
    { label: '売上(税込)', value: `¥${d.revenue.toLocaleString()}`, href: '/admin/orders' },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-xl font-bold text-sumi">ダッシュボード（{d.date}）</h1>
        <DateNav date={date} basePath="/admin" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card">
            <p className="text-sm text-sumi-soft">{c.label}</p>
            <p className="mt-1 font-serif text-2xl font-bold text-shu">{c.value}</p>
          </Link>
        ))}
      </div>
      <div className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-sumi">この日の席予約</h2>
        {list.length === 0 && <p className="text-sumi-soft">この日の予約はありません。</p>}
        {list.map((r) => <ReservationCard key={r.id} r={r} />)}
      </div>
    </div>
  );
}

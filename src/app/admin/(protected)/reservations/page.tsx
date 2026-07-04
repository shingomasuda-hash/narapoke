import { loadReservationsForDate, todayJst } from '@/lib/admin-data';
import { DateNav } from '../DateNav';
import { ReservationCard } from '../ReservationCard';

export const dynamic = 'force-dynamic';

function normalizeDate(raw: string | undefined): string {
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayJst();
}

export default async function AdminReservations({ searchParams }: { searchParams: { date?: string } }) {
  const date = normalizeDate(searchParams.date);
  const list = await loadReservationsForDate(date);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-xl font-bold text-sumi">席予約（{date}）</h1>
        <DateNav date={date} basePath="/admin/reservations" />
      </div>
      {list.length === 0 && <p className="text-sumi-soft">この日の予約はありません。</p>}
      {list.map((r) => <ReservationCard key={r.id} r={r} />)}
    </div>
  );
}

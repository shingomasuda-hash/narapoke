import { loadTodayReservations } from '@/lib/admin-data';
import { ResStatus } from '../StatusButtons';

export const dynamic = 'force-dynamic';

export default async function AdminReservations() {
  const list = await loadTodayReservations();
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-xl font-bold text-sumi">本日の席予約</h1>
      {list.length === 0 && <p className="text-sumi-soft">本日の予約はありません。</p>}
      {list.map((r) => (
        <div key={r.id} className="card space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sumi">{new Date(r.start_at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })} ・ {r.party_size}名</span>
            <span className="text-xs text-sumi-soft">{r.reservation_code}</span>
          </div>
          <p className="text-sm">{r.customer_name}様 / <a href={`tel:${r.phone}`} className="text-shu underline">{r.phone}</a></p>
          {r.allergy && <p className="text-xs text-shu">アレルギー: {r.allergy}</p>}
          {r.note && <p className="text-xs text-sumi-soft">備考: {r.note}</p>}
          <ResStatus id={r.id} status={r.status} />
        </div>
      ))}
    </div>
  );
}

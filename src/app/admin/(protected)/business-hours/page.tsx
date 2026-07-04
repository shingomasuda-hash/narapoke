import { useMockData } from '@/lib/config';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const WD = ['日', '月', '火', '水', '木', '金', '土'];
const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

async function load() {
  if (useMockData) {
    return [0, 1, 2, 3, 4, 5, 6].flatMap((w) => w === 4
      ? [{ weekday: 4, open_minutes: 0, close_minutes: 0, is_closed: true }]
      : [{ weekday: w, open_minutes: 660, close_minutes: 960, is_closed: false }, { weekday: w, open_minutes: 1080, close_minutes: 1440, is_closed: false }]);
  }
  const sb = createSupabaseServer();
  const { data } = await sb.from('business_hours').select('*').order('weekday');
  return data ?? [];
}

export default async function AdminBusinessHours() {
  const rows = await load();
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-xl font-bold text-sumi">営業時間管理</h1>
      <p className="text-sm text-sumi-soft">曜日ごとの営業時間です（24:00は翌0:00として扱われます）。特定日の変更は「臨時休業」および特別営業時間で対応します。</p>
      <div className="space-y-2">
        {WD.map((label, w) => {
          const days = rows.filter((r) => r.weekday === w);
          const closed = days.some((d) => d.is_closed) || days.length === 0;
          return (
            <div key={w} className="card flex items-center justify-between">
              <span className="font-bold text-sumi">{label}曜日</span>
              {closed ? <span className="font-semibold text-shu">定休日</span>
                : <span className="text-sm">{days.filter((d) => !d.is_closed).map((d) => `${fmt(d.open_minutes)}〜${fmt(d.close_minutes)}`).join(' / ')}</span>}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-sumi-soft">※ 編集UIは今後拡張予定。現状は seed / Supabase 上で調整できます。</p>
    </div>
  );
}

'use client';
import { useRouter } from 'next/navigation';

function addDays(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + delta);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(d);
}

export function DateNav({ date, basePath }: { date: string; basePath: string }) {
  const router = useRouter();
  const go = (d: string) => router.push(`${basePath}?date=${d}`);
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => go(addDays(date, -1))} className="rounded-full border border-sumi/20 bg-white px-3 py-1.5 text-sm font-semibold text-sumi hover:border-shu" aria-label="前日">←</button>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="rounded border border-sumi/20 px-2 py-1.5 text-sm"
      />
      <button onClick={() => go(addDays(date, 1))} className="rounded-full border border-sumi/20 bg-white px-3 py-1.5 text-sm font-semibold text-sumi hover:border-shu" aria-label="翌日">→</button>
    </div>
  );
}

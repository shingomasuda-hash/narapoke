'use client';
/** クライアント専用ユーティリティ（node:crypto は使わない）。 */

export function generateIdempotencyKeyClient(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/** 今日から days 日先までの日付リスト（JST基準）。木曜フラグ付き。 */
export function nextDates(days: number) {
  const out: { value: string; month: number; day: number; weekday: string; thursday: boolean }[] = [];
  const now = new Date();
  for (let i = 0; i <= days; i++) {
    const d = new Date(now.getTime() + i * 86_400_000);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')!.value;
    const mo = parts.find((p) => p.type === 'month')!.value;
    const da = parts.find((p) => p.type === 'day')!.value;
    const value = `${y}-${mo}-${da}`;
    const wdIdx = new Date(`${value}T00:00:00+09:00`).getUTCDay();
    // JST 00:00 の UTC 曜日は前日にずれるため getDay をローカルではなく計算で
    const jstWd = new Date(`${value}T12:00:00+09:00`).getUTCDay();
    out.push({ value, month: Number(mo), day: Number(da), weekday: WD[jstWd], thursday: jstWd === 4 });
    void wdIdx;
  }
  return out;
}

export function jpDateLabel(value: string): string {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  const jstWd = new Date(`${value}T12:00:00+09:00`).getUTCDay();
  return `${y}年${m}月${d}日（${WD[jstWd]}）`;
}

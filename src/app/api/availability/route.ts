/**
 * 空き日時取得 API（個人情報は返さない。集計のみ）。
 * GET /api/availability?date=YYYY-MM-DD&partySize=2
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadSettings, stayMinutesFor } from '@/lib/settings';
import { generateStartSlots, isThursday, parseTimeToMinutes, jstInstant } from '@/lib/time';
import { canReserve, type Interval } from '@/lib/availability';
import { useMockData } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  const partySize = Math.max(1, Number(req.nextUrl.searchParams.get('partySize') ?? '2'));
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 });
  }
  const settings = await loadSettings();

  if (isThursday(date)) {
    return NextResponse.json({ date, closed: true, reason: 'THURSDAY', slots: [] });
  }

  const rawSlots = generateStartSlots({
    serviceDate: date,
    slotMinutes: settings.slotMinutes,
    acceptCutoffMinutes: settings.acceptCutoffMinutes,
  });

  // 既存予約の取得（本番のみ）
  let existing: Interval[] = [];
  let blockedRanges: { start: number; end: number }[] = [];
  let closedAllDay = false;
  if (!useMockData) {
    try {
      const sb = createSupabaseAdmin();
      const [{ data: res }, { data: blocks }, { data: cls }] = await Promise.all([
        sb.from('reservations').select('start_at,end_at,party_size,status').eq('service_date', date).in('status', ['confirmed', 'completed']),
        sb.from('reservation_blocks').select('start_at,end_at,block_type').eq('service_date', date),
        sb.from('closures').select('all_day,start_minutes,end_minutes').eq('service_date', date),
      ]);
      existing = (res ?? []).map((r) => ({ start: new Date(r.start_at), end: new Date(r.end_at), size: r.party_size }));
      closedAllDay = (cls ?? []).some((c) => c.all_day);
      blockedRanges = (blocks ?? []).map((b) => ({
        start: new Date(b.start_at).getTime(), end: new Date(b.end_at).getTime(),
      }));
    } catch {
      /* フォールバック: 空き扱い */
    }
  }

  if (closedAllDay) {
    return NextResponse.json({ date, closed: true, reason: 'CLOSED', slots: [] });
  }

  const slots = rawSlots.map((s) => {
    const startMin = s.minutes;
    const stay = stayMinutesFor(startMin, settings);
    const startAt = jstInstant(date, startMin);
    const endAt = new Date(startAt.getTime() + stay * 60_000);
    const blocked = blockedRanges.some((b) => b.start < endAt.getTime() && b.end > startAt.getTime());
    const check = canReserve({ existing, candidate: { start: startAt, end: endAt, size: partySize }, capacity: settings.seatCapacity });
    return {
      time: s.label,
      // 締切(現在時刻から accept_cutoff_minutes 分後より前)を過ぎた枠は無効表示にする（一覧からは消さない）
      available: !s.pastCutoff && !blocked && check.ok,
      remaining: s.pastCutoff || blocked ? 0 : check.remaining,
    };
  });

  return NextResponse.json({ date, closed: false, capacity: settings.seatCapacity, slots });
}

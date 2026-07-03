/** テイクアウト受取枠の取得（枠上限に対する残数）。 */
import { NextRequest, NextResponse } from 'next/server';
import { loadSettings } from '@/lib/settings';
import { generateStartSlots, isThursday, jstInstant, parseTimeToMinutes } from '@/lib/time';
import { useMockData } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 });
  }
  if (isThursday(date)) return NextResponse.json({ date, closed: true, slots: [] });
  const settings = await loadSettings();
  const raw = generateStartSlots({
    serviceDate: date, slotMinutes: settings.takeoutSlotMinutes,
    acceptCutoffMinutes: settings.takeoutCutoffMinutes,
  });

  const counts = new Map<string, number>();
  if (!useMockData) {
    try {
      const sb = createSupabaseAdmin();
      const { data } = await sb.from('takeout_orders')
        .select('pickup_at,status').eq('service_date', date).neq('status', 'cancelled');
      for (const o of data ?? []) {
        const key = new Date(o.pickup_at).toISOString();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    } catch { /* fallback empty */ }
  }

  const slots = raw.map((s) => {
    const at = jstInstant(date, parseTimeToMinutes(s.label)).toISOString();
    const used = counts.get(at) ?? 0;
    return { time: s.label, available: used < settings.takeoutSlotCapacity, remaining: Math.max(0, settings.takeoutSlotCapacity - used) };
  });
  return NextResponse.json({ date, closed: false, slots });
}

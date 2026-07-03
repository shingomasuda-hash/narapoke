/**
 * リマインド定期実行（Vercel Cron 想定）。
 * - 席予約: 前日18:00 / 開始2時間前
 * - テイクアウト: 受取2時間前
 * - notification_logs で同一リマインドの二重送信を防止。
 * 認証: Authorization: Bearer CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server';
import { env, useMockData } from '@/lib/config';
import { loadSettings } from '@/lib/settings';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { notify } from '@/lib/line/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!env.cronSecret || auth !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const settings = await loadSettings();
  if (!settings) return NextResponse.json({ ok: true, skipped: 'no settings' });

  if (useMockData) {
    console.info('[MOCK cron] リマインド実行（送信なし）');
    return NextResponse.json({ ok: true, mock: true });
  }

  const sb = createSupabaseAdmin();
  const now = Date.now();
  const beforeMs = 2 * 3600_000; // 開始/受取2時間前（管理設定 reminder_before_hours 参照可）
  let sent = 0;

  // 開始 N 時間前リマインド（席予約）
  const windowStart = new Date(now).toISOString();
  const windowEnd = new Date(now + beforeMs).toISOString();
  const { data: reservations } = await sb
    .from('reservations')
    .select('id,line_user_id,start_at,reservation_code,party_size')
    .eq('status', 'confirmed')
    .gte('start_at', windowStart)
    .lte('start_at', windowEnd);

  for (const r of reservations ?? []) {
    if (!r.line_user_id) continue;
    await notify({
      to: r.line_user_id,
      messages: [{ type: 'text', text: `まもなくご来店時刻です。ご予約 ${r.reservation_code}（${r.party_size}名）` }],
      targetType: 'reservation', targetId: r.id, kind: 'reminder_before',
    });
    sent++;
  }

  // 受取 N 時間前リマインド（テイクアウト）
  const { data: orders } = await sb
    .from('takeout_orders')
    .select('id,line_user_id,pickup_at,order_code,total')
    .in('status', ['received', 'cooking', 'ready'])
    .gte('pickup_at', windowStart)
    .lte('pickup_at', windowEnd);

  for (const o of orders ?? []) {
    if (!o.line_user_id) continue;
    await notify({
      to: o.line_user_id,
      messages: [{ type: 'text', text: `まもなく受取時刻です。ご注文 ${o.order_code}（¥${o.total.toLocaleString()}）` }],
      targetType: 'takeout', targetId: o.id, kind: 'reminder_before',
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}

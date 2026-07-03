/**
 * LINE Messaging API Webhook 受信。
 * - 署名(x-line-signature)を必ず検証。
 * - webhook_events で再送(重複)を防止。
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyLineSignature } from '@/lib/line/verify';
import { useMockData } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get('x-line-signature');

  if (!verifyLineSignature(raw, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let body: { events?: { webhookEventId?: string; type: string }[] } = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  for (const ev of body.events ?? []) {
    const eventId = ev.webhookEventId ?? `${Date.now()}-${Math.random()}`;
    if (!useMockData) {
      try {
        const sb = createSupabaseAdmin();
        // 既に処理済みならスキップ（重複再送対策）
        const { error } = await sb.from('webhook_events').insert({ event_id: eventId, payload: ev });
        if (error && error.code === '23505') continue; // unique violation = 処理済み
      } catch (e) {
        console.error('[webhook] 記録失敗', (e as Error).message);
      }
    }
    // ここで follow / message などのイベント処理を追加できる
    console.info('[LINE webhook] event', ev.type, eventId);
  }

  return NextResponse.json({ ok: true });
}

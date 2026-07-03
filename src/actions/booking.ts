'use server';
/**
 * トークンによる予約/注文の確認・変更・キャンセル。
 * トークンは平文保存していないため、ハッシュで突合する。個人情報は最小限のみ返す。
 */
import { hashToken } from '@/lib/codes';
import { cancelInputSchema } from '@/lib/schemas';
import { useMockData } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { loadSettings } from '@/lib/settings';
import { notify } from '@/lib/line/client';

export interface BookingView {
  ok: boolean;
  kind?: 'reservation' | 'takeout';
  status?: string;
  code?: string;
  when?: string;
  partySize?: number;
  total?: number;
  canCancel?: boolean;
  message?: string;
}

export async function lookupBookingAction(token: string): Promise<BookingView> {
  if (!token || token.length < 10) return { ok: false, message: 'リンクが正しくありません。' };
  if (useMockData) {
    return { ok: true, kind: 'reservation', status: 'confirmed', code: 'R-XXXX-XXXX', when: '（開発モック）', partySize: 2, canCancel: true };
  }
  const hash = hashToken(token);
  const sb = createSupabaseAdmin();

  const { data: r } = await sb.from('reservations')
    .select('reservation_code,service_date,start_at,party_size,status')
    .eq('cancel_token_hash', hash).maybeSingle();
  if (r) {
    return {
      ok: true, kind: 'reservation', status: r.status, code: r.reservation_code,
      when: `${r.service_date} ${new Date(r.start_at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}`,
      partySize: r.party_size, canCancel: r.status === 'confirmed',
    };
  }
  const { data: o } = await sb.from('takeout_orders')
    .select('order_code,pickup_at,total,status').eq('cancel_token_hash', hash).maybeSingle();
  if (o) {
    return {
      ok: true, kind: 'takeout', status: o.status, code: o.order_code,
      when: new Date(o.pickup_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      total: o.total, canCancel: o.status === 'received', // 調理開始(cooking)前のみ
    };
  }
  return { ok: false, message: 'ご予約が見つかりませんでした。' };
}

export async function cancelBookingAction(rawToken: string): Promise<{ ok: boolean; message: string }> {
  const parsed = cancelInputSchema.safeParse({ token: rawToken });
  if (!parsed.success) return { ok: false, message: 'リンクが正しくありません。' };
  if (useMockData) return { ok: true, message: 'キャンセルしました（開発モック）。' };

  const hash = hashToken(parsed.data.token);
  const sb = createSupabaseAdmin();

  const { data: r } = await sb.from('reservations').select('id,line_user_id,status,reservation_code').eq('cancel_token_hash', hash).maybeSingle();
  if (r) {
    if (r.status !== 'confirmed') return { ok: false, message: 'この予約はキャンセルできません。' };
    await sb.from('reservations').update({ status: 'cancelled' }).eq('id', r.id);
    if (r.line_user_id) await notify({ to: r.line_user_id, messages: [{ type: 'text', text: `ご予約 ${r.reservation_code} をキャンセルしました。` }], targetType: 'reservation', targetId: r.id, kind: 'cancelled' });
    return { ok: true, message: 'ご予約をキャンセルしました。' };
  }

  const { data: o } = await sb.from('takeout_orders').select('id,line_user_id,status,order_code').eq('cancel_token_hash', hash).maybeSingle();
  if (o) {
    const settings = await loadSettings(); void settings;
    if (o.status !== 'received') return { ok: false, message: '調理開始後のためキャンセルできません。店舗へご連絡ください。' };
    await sb.from('takeout_orders').update({ status: 'cancelled' }).eq('id', o.id);
    if (o.line_user_id) await notify({ to: o.line_user_id, messages: [{ type: 'text', text: `ご注文 ${o.order_code} をキャンセルしました。` }], targetType: 'takeout', targetId: o.id, kind: 'cancelled' });
    return { ok: true, message: 'ご注文をキャンセルしました。' };
  }
  return { ok: false, message: 'ご予約が見つかりませんでした。' };
}

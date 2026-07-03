/**
 * LINE Messaging API 送信クライアント。
 * - lineSendEnabled=false（フラグ OFF or 未設定）ならコンソールに出力するモック送信。
 * - 送信の成否は notification_logs に記録し、失敗しても予約/注文自体は成功させる。
 */
import { lineSendEnabled, env } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

type Message = Record<string, unknown>;

export async function pushMessage(to: string, messages: Message[]): Promise<{ ok: boolean; error?: string }> {
  if (!lineSendEnabled) {
    // 開発/未設定時はローカルログへ出力（実送信しない）
    console.info('[LINE mock] push to', to, JSON.stringify(messages));
    return { ok: true };
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.lineChannelAccessToken}`,
      },
      body: JSON.stringify({ to, messages }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `LINE push ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * 通知を送り、結果を notification_logs に記録する。
 * uq_notification_once により同一(target,kind,recipient)の二重送信は抑止される。
 */
export async function notify(params: {
  to: string | null;
  messages: Message[];
  targetType: 'reservation' | 'takeout';
  targetId: string;
  kind: string;
}): Promise<void> {
  const { to, messages, targetType, targetId, kind } = params;
  const recipient = to ?? '(none)';
  let result: { ok: boolean; error?: string } = { ok: true };
  if (to) {
    result = await pushMessage(to, messages);
  } else {
    console.info('[LINE] 宛先なしのためスキップ', kind, targetId);
  }
  try {
    const sb = createSupabaseAdmin();
    await sb.from('notification_logs').insert({
      target_type: targetType,
      target_id: targetId,
      channel: lineSendEnabled ? 'line' : 'mock',
      kind,
      recipient,
      status: result.ok ? 'sent' : 'failed',
      error: result.error ?? null,
    });
  } catch (e) {
    console.error('[LINE] notification_logs 記録失敗', (e as Error).message);
  }
}

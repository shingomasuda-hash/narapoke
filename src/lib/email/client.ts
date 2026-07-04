/**
 * メール送信クライアント（Resend）。
 * - emailSendEnabled=false（RESEND_API_KEY 未設定）ならコンソールに出力するモック送信。
 * - 送信の成否は notification_logs に記録し、失敗しても予約自体は成功させる。
 * - notification_logs の一意制約 (target_type,target_id,kind,recipient) で同一メールの二重送信を防ぐ。
 */
import { Resend } from 'resend';
import { emailSendEnabled, env } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

let client: Resend | null = null;
function getClient(): Resend {
  if (!client) client = new Resend(env.resendApiKey);
  return client;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  targetType: 'reservation' | 'takeout';
  targetId: string;
  kind: string;
}): Promise<void> {
  const { to, subject, html, targetType, targetId, kind } = params;

  // 既に送信済みなら重複送信しない（notification_logs を先にチェック）
  try {
    const sb = createSupabaseAdmin();
    const { data: existing } = await sb
      .from('notification_logs')
      .select('id')
      .eq('target_type', targetType).eq('target_id', targetId)
      .eq('channel', 'email').eq('kind', kind).eq('recipient', to)
      .eq('status', 'sent').maybeSingle();
    if (existing) return;
  } catch (e) {
    console.error('[email] notification_logs 確認失敗', (e as Error).message);
  }

  let result: { ok: boolean; error?: string } = { ok: true };
  if (!emailSendEnabled) {
    console.info('[email mock] send to', to, subject);
  } else {
    try {
      const { error } = await getClient().emails.send({ from: env.resendFromEmail, to, subject, html });
      if (error) result = { ok: false, error: error.message };
    } catch (e) {
      result = { ok: false, error: (e as Error).message };
    }
  }

  try {
    const sb = createSupabaseAdmin();
    await sb.from('notification_logs').insert({
      target_type: targetType,
      target_id: targetId,
      channel: 'email',
      kind,
      recipient: to,
      status: result.ok ? 'sent' : 'failed',
      error: result.error ?? null,
    });
  } catch (e) {
    console.error('[email] notification_logs 記録失敗', (e as Error).message);
  }
}

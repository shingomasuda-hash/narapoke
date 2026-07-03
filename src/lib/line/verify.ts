/**
 * LINE Webhook 署名検証 & IDトークン検証。
 * Channel Secret / Access Token はサーバー側のみで扱う。
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/config';

/** x-line-signature を検証する（本文の生バイト列で計算）。 */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !env.lineChannelSecret) return false;
  const hmac = createHmac('sha256', env.lineChannelSecret).update(rawBody).digest('base64');
  const a = Buffer.from(hmac);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * LIFF から受け取った ID トークンをサーバー側で検証する。
 * クライアントの表示名や userId を鵜呑みにせず、必ずここを通す。
 * （ネットワーク前提のため実呼び出しは本番環境で行う）
 */
export async function verifyLineIdToken(idToken: string): Promise<{
  ok: boolean;
  userId?: string;
  displayName?: string;
  error?: string;
}> {
  if (!env.lineChannelId) return { ok: false, error: 'LINE_CHANNEL_ID 未設定' };
  try {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: env.lineChannelId }),
    });
    if (!res.ok) return { ok: false, error: `verify failed: ${res.status}` };
    const data = (await res.json()) as { sub?: string; name?: string };
    return { ok: true, userId: data.sub, displayName: data.name };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

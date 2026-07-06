'use server';
/**
 * 管理者ログイン Server Action。
 * ブラウザから直接 Supabase を呼ぶ従来方式だとアプリ側でレート制限をかけられないため、
 * サーバー経由にして IP レート制限 + アカウント単位のロックアウトを適用する。
 */
import { headers } from 'next/headers';
import { createSupabaseServer } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { checkLoginLock, recordLoginFailure, recordLoginSuccess } from '@/lib/login-guard';

export interface SignInResult {
  ok: boolean;
  message?: string;
  needsMfa?: boolean;
}

export async function signInAdminAction(email: string, password: string): Promise<SignInResult> {
  const ip = headers().get('x-forwarded-for') ?? 'local';
  if (!rateLimit(`admin-login-ip:${ip}`, 10, 15 * 60_000).ok) {
    return { ok: false, message: 'ログイン試行が多すぎます。しばらくしてから再度お試しください。' };
  }

  const emailKey = email.trim().toLowerCase();
  const lock = checkLoginLock(emailKey);
  if (lock.locked) {
    const min = Math.ceil(lock.retryAfterMs / 60_000);
    return { ok: false, message: `試行回数が多いため、このアカウントは一時的にロックされています。${min}分後に再度お試しください。` };
  }

  const sb = createSupabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    recordLoginFailure(emailKey);
    return { ok: false, message: 'ログインに失敗しました。メールアドレスとパスワードをご確認ください。' };
  }
  recordLoginSuccess(emailKey);

  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  const needsMfa = Boolean(aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel);
  return { ok: true, needsMfa };
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/config';
import { signInAdminAction } from '@/actions/auth';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(''); setBusy(true);
    if (!isSupabaseConfigured) { router.push('/admin'); return; } // 開発モックは素通し

    // ログインはサーバー側(signInAdminAction)を経由させ、IPレート制限とアカウント
    // ロックアウトを適用する（ブラウザから直接Supabaseを呼ぶと制限をかけられないため）。
    const result = await signInAdminAction(email, password);
    setBusy(false);
    if (!result.ok) { setErr(result.message ?? 'ログインに失敗しました。'); return; }

    // 2FA(TOTP)登録済みアカウントは、まだ aal2 に達していなければ確認画面へ誘導する。
    // 未登録アカウントはここまで（今回は AAL2 を必須にしない）。
    if (result.needsMfa) {
      router.push('/admin/login/mfa');
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="e" className="field-label">メールアドレス</label>
        <input id="e" type="email" className="field-input" value={email} onChange={(ev) => setEmail(ev.target.value)} autoComplete="email" />
      </div>
      <div>
        <label htmlFor="p" className="field-label">パスワード</label>
        <input id="p" type="password" className="field-input" value={password} onChange={(ev) => setPassword(ev.target.value)} autoComplete="current-password" />
      </div>
      {err && <p className="error-text" role="alert">{err}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary">{busy ? '…' : 'ログイン'}</button>
      {!isSupabaseConfigured && <p className="text-center text-xs text-sumi-soft">（開発モード: そのまま管理画面を表示します）</p>}
    </div>
  );
}

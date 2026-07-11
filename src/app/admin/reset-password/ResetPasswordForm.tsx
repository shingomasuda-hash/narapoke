'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/config';
import { createSupabaseBrowser } from '@/lib/supabase/client';

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setErr('');
    if (password.length < 8) { setErr('パスワードは8文字以上で入力してください。'); return; }
    if (password !== confirm) { setErr('パスワード（確認）が一致しません。'); return; }

    setBusy(true);
    if (!isSupabaseConfigured) { setBusy(false); setDone(true); return; } // 開発モックは素通し

    const sb = createSupabaseBrowser();
    const { error } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (error) { setErr('パスワードの更新に失敗しました。時間をおいて再度お試しください。'); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-sumi">パスワードを更新しました。</p>
        <button onClick={() => router.push('/admin/login')} className="btn-primary">ログイン画面へ</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="np" className="field-label">新しいパスワード</label>
        <input id="np" type="password" className="field-input" value={password} onChange={(ev) => setPassword(ev.target.value)} autoComplete="new-password" />
      </div>
      <div>
        <label htmlFor="cp" className="field-label">新しいパスワード（確認）</label>
        <input id="cp" type="password" className="field-input" value={confirm} onChange={(ev) => setConfirm(ev.target.value)} autoComplete="new-password" />
      </div>
      {err && <p className="error-text" role="alert">{err}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary">{busy ? '…' : 'パスワードを更新'}</button>
      {!isSupabaseConfigured && <p className="text-center text-xs text-sumi-soft">（開発モード: 実際のパスワード更新は行われません）</p>}
    </div>
  );
}

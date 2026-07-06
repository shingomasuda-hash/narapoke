'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/config';

export function MfaChallengeForm() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const sb = createSupabaseBrowser();
    sb.auth.mfa.listFactors().then(({ data, error }) => {
      if (error || !data) { setErr('認証情報の取得に失敗しました。もう一度ログインし直してください。'); setLoading(false); return; }
      const verified = data.totp.find((f) => f.status === 'verified');
      if (!verified) { setErr('2段階認証が設定されていません。もう一度ログインし直してください。'); setLoading(false); return; }
      setFactorId(verified.id);
      setLoading(false);
    });
  }, []);

  async function submit() {
    if (!factorId) return;
    setErr(''); setBusy(true);
    const sb = createSupabaseBrowser();
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (error) { setErr('確認コードが正しくありません。'); return; }
    router.push('/admin');
    router.refresh();
  }

  if (!isSupabaseConfigured) {
    return <p className="text-center text-sm text-sumi-soft">開発モードでは2段階認証は利用できません。</p>;
  }
  if (loading) return <p className="text-center text-sumi-soft">確認中…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-sumi-soft">認証アプリに表示されている6桁のコードを入力してください。</p>
      <div>
        <label htmlFor="mfa-code" className="field-label">確認コード</label>
        <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          className="field-input text-center text-2xl tracking-widest" value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
      </div>
      {err && <p className="error-text" role="alert">{err}</p>}
      <button onClick={submit} disabled={busy || code.length < 6 || !factorId} className="btn-primary">{busy ? '確認中…' : '確認する'}</button>
    </div>
  );
}

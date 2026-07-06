'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/config';

interface Factor { id: string; status: 'verified' | 'unverified'; friendly_name?: string; created_at: string }

export function MfaEnrollClient() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrDataUrl: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function refresh() {
    const sb = createSupabaseBrowser();
    const { data } = await sb.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    refresh();
  }, []);

  async function startEnroll() {
    setErr(''); setMsg(''); setBusy(true);
    const sb = createSupabaseBrowser();
    const { data, error } = await sb.auth.mfa.enroll({
      factorType: 'totp', issuer: 'なら和ポケ日和 管理画面', friendlyName: `authenticator-${Date.now()}`,
    });
    setBusy(false);
    if (error || !data) { setErr('登録の開始に失敗しました。'); return; }
    setEnrolling({
      factorId: data.id,
      qrDataUrl: `data:image/svg+xml;utf-8,${encodeURIComponent(data.totp.qr_code)}`,
      secret: data.totp.secret,
    });
  }

  async function verify() {
    if (!enrolling) return;
    setErr(''); setBusy(true);
    const sb = createSupabaseBrowser();
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: enrolling.factorId, code: code.trim() });
    setBusy(false);
    if (error) { setErr('確認コードが正しくありません。'); return; }
    setMsg('2段階認証を登録しました。');
    setEnrolling(null);
    setCode('');
    refresh();
  }

  async function unenroll(factorId: string) {
    if (!confirm('この2段階認証を解除しますか？')) return;
    setErr(''); setMsg(''); setBusy(true);
    const sb = createSupabaseBrowser();
    const { error } = await sb.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) { setErr('解除に失敗しました。'); return; }
    setMsg('2段階認証を解除しました。');
    refresh();
  }

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-sumi-soft">開発モードでは2段階認証は利用できません。</p>;
  }
  if (loading) return <p className="text-sumi-soft">確認中…</p>;

  const verifiedFactor = factors.find((f) => f.status === 'verified');

  return (
    <div className="space-y-4">
      {msg && <p className="rounded-xl bg-cream-deep p-3 text-sm font-semibold text-sumi">{msg}</p>}
      {err && <p className="error-text" role="alert">{err}</p>}

      {verifiedFactor ? (
        <div className="card space-y-2">
          <p className="font-semibold text-matcha">2段階認証: 有効</p>
          <p className="text-xs text-sumi-soft">登録日時: {new Date(verifiedFactor.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
          <button disabled={busy} onClick={() => unenroll(verifiedFactor.id)} className="btn-outline">この2段階認証を解除する</button>
        </div>
      ) : enrolling ? (
        <div className="card space-y-3">
          <p className="text-sm text-sumi">認証アプリ（Google Authenticator等）でQRコードを読み取ってください。</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolling.qrDataUrl} alt="TOTP QRコード" className="mx-auto h-48 w-48" />
          <p className="text-xs text-sumi-soft">読み取れない場合は、以下のキーを手動で入力してください。</p>
          <p className="break-all rounded bg-cream-deep p-2 text-center text-sm font-mono">{enrolling.secret}</p>
          <div>
            <label htmlFor="enroll-code" className="field-label">アプリに表示された6桁のコード</label>
            <input id="enroll-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              className="field-input text-center text-2xl tracking-widest" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </div>
          <button disabled={busy || code.length < 6} onClick={verify} className="btn-primary">{busy ? '確認中…' : '確認して登録する'}</button>
          <button disabled={busy} onClick={() => { setEnrolling(null); setCode(''); }} className="btn-outline">やめる</button>
        </div>
      ) : (
        <div className="card space-y-2">
          <p className="text-sm text-sumi-soft">現在、2段階認証は設定されていません。</p>
          <button disabled={busy} onClick={startEnroll} className="btn-primary">2段階認証を登録する</button>
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { lookupBookingAction, cancelBookingAction, type BookingView } from '@/actions/booking';

const STATUS_JA: Record<string, string> = {
  confirmed: '予約確定', cancelled: 'キャンセル済み', completed: '来店済み', no_show: '無断キャンセル',
  received: '受付済み', cooking: '調理中', ready: '受取準備完了', picked_up: '受取済み',
};

export function BookingClient({ token }: { token: string }) {
  const [view, setView] = useState<BookingView | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => { lookupBookingAction(token).then(setView); }, [token]);

  async function doCancel() {
    setBusy(true);
    const res = await cancelBookingAction(token);
    setBusy(false);
    setMsg(res.message);
    if (res.ok) { setConfirmCancel(false); lookupBookingAction(token).then(setView); }
  }

  if (!view) return <main><p className="text-sumi-soft">読み込み中…</p></main>;
  if (!view.ok) return (
    <main className="space-y-4 text-center">
      <p className="font-semibold text-shu">{view.message}</p>
      <Link href="/" className="btn-outline">トップに戻る</Link>
    </main>
  );

  return (
    <main className="space-y-5">
      <Link href="/" className="text-sm text-shu underline">← トップに戻る</Link>
      <h1 className="font-serif text-xl font-bold text-sumi">{view.kind === 'reservation' ? 'ご予約内容' : 'ご注文内容'}</h1>
      <div className="card space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-sumi-soft">番号</span><span className="font-bold text-shu">{view.code}</span></div>
        <div className="flex justify-between"><span className="text-sumi-soft">状態</span><span className="font-semibold">{STATUS_JA[view.status ?? ''] ?? view.status}</span></div>
        <div className="flex justify-between"><span className="text-sumi-soft">日時</span><span className="font-semibold">{view.when}</span></div>
        {view.partySize && <div className="flex justify-between"><span className="text-sumi-soft">人数</span><span className="font-semibold">{view.partySize}名</span></div>}
        {view.total != null && <div className="flex justify-between"><span className="text-sumi-soft">合計</span><span className="font-semibold">¥{view.total.toLocaleString()}</span></div>}
      </div>

      {msg && <p className="rounded-xl bg-cream-deep p-3 text-center text-sm font-semibold text-sumi">{msg}</p>}

      {view.canCancel && !confirmCancel && (
        <button onClick={() => setConfirmCancel(true)} className="btn-outline">この予約をキャンセルする</button>
      )}
      {confirmCancel && (
        <div className="card space-y-3">
          <p className="text-sm text-sumi">本当にキャンセルしますか？この操作は取り消せません。</p>
          <button onClick={doCancel} disabled={busy} className="btn-primary">{busy ? '処理中…' : 'キャンセルを確定する'}</button>
          <button onClick={() => setConfirmCancel(false)} className="btn-outline">やめる</button>
        </div>
      )}

      <p className="text-xs text-sumi-soft">
        日時・人数の変更をご希望の場合は、お手数ですが一度キャンセルのうえ再度ご予約いただくか、店舗へ直接ご連絡ください。
      </p>
    </main>
  );
}

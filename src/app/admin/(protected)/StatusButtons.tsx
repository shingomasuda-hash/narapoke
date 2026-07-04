'use client';
import { useState, useTransition } from 'react';
import { setReservationStatus, setOrderStatus, toggleSoldOut, togglePublished, updateItemPrice } from '@/actions/admin';

export function ResStatus({ id, status }: { id: string; status: string }) {
  const [cur, setCur] = useState(status);
  const [pending, start] = useTransition();
  const act = (s: 'completed' | 'no_show' | 'cancelled') => start(async () => { await setReservationStatus(id, s); setCur(s); });
  return (
    <div className="flex flex-wrap gap-1">
      <span className="rounded bg-cream-deep px-2 py-1 text-xs font-semibold">{jaRes(cur)}</span>
      {cur === 'confirmed' && (<>
        <button disabled={pending} onClick={() => act('completed')} className="rounded bg-matcha px-2 py-1 text-xs font-semibold text-white">来店済</button>
        <button disabled={pending} onClick={() => act('no_show')} className="rounded bg-sumi-soft px-2 py-1 text-xs font-semibold text-white">無断</button>
        <button disabled={pending} onClick={() => act('cancelled')} className="rounded bg-shu px-2 py-1 text-xs font-semibold text-white">取消</button>
      </>)}
    </div>
  );
}

export function OrderStatus({ id, status }: { id: string; status: string }) {
  const [cur, setCur] = useState(status);
  const [pending, start] = useTransition();
  const flow: Record<string, string> = { received: 'cooking', cooking: 'ready', ready: 'picked_up' };
  const next = flow[cur];
  const act = (s: 'cooking' | 'ready' | 'picked_up' | 'cancelled') => start(async () => { await setOrderStatus(id, s); setCur(s); });
  return (
    <div className="flex flex-wrap gap-1">
      <span className="rounded bg-cream-deep px-2 py-1 text-xs font-semibold">{jaOrder(cur)}</span>
      {next && <button disabled={pending} onClick={() => act(next as 'cooking')} className="rounded bg-matcha px-2 py-1 text-xs font-semibold text-white">{jaOrder(next)}へ</button>}
      {cur === 'received' && <button disabled={pending} onClick={() => act('cancelled')} className="rounded bg-shu px-2 py-1 text-xs font-semibold text-white">取消</button>}
    </div>
  );
}

export function MenuControls({ id, price, soldOut, published }: { id: string; price: number; soldOut: boolean; published: boolean }) {
  const [p, setP] = useState(price);
  const [so, setSo] = useState(soldOut);
  const [pub, setPub] = useState(published);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="number" value={p} onChange={(e) => setP(Number(e.target.value))} className="w-24 rounded border border-sumi/20 px-2 py-1 text-sm" />
      <button disabled={pending} onClick={() => start(async () => { await updateItemPrice(id, p); })} className="rounded bg-sumi px-2 py-1 text-xs font-semibold text-cream">価格保存</button>
      <button disabled={pending} onClick={() => start(async () => { await toggleSoldOut(id, !so); setSo(!so); })} className={`rounded px-2 py-1 text-xs font-semibold ${so ? 'bg-shu text-white' : 'bg-cream-deep'}`}>{so ? '売切中' : '在庫あり'}</button>
      <button disabled={pending} onClick={() => start(async () => { await togglePublished(id, !pub); setPub(!pub); })} className={`rounded px-2 py-1 text-xs font-semibold ${pub ? 'bg-matcha text-white' : 'bg-cream-deep'}`}>{pub ? '公開中' : '非公開'}</button>
    </div>
  );
}

function jaRes(s: string) { return ({ confirmed: '確定', cancelled: '取消', completed: '来店済', no_show: '無断' } as Record<string, string>)[s] ?? s; }
function jaOrder(s: string) { return ({ received: '受付', cooking: '調理中', ready: '準備完了', picked_up: '受取済', cancelled: '取消' } as Record<string, string>)[s] ?? s; }

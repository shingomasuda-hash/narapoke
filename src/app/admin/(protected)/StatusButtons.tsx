'use client';
import { useState, useTransition } from 'react';
import { setReservationStatus, setOrderStatus, toggleSoldOut, togglePublished, updateItemPrice } from '@/actions/admin';

const RES_STATUSES = ['confirmed', 'completed', 'no_show', 'cancelled'] as const;
type ResStatusValue = (typeof RES_STATUSES)[number];
const RES_STATUS_COLOR: Record<ResStatusValue, string> = {
  confirmed: 'bg-sumi text-cream',
  completed: 'bg-matcha text-white',
  no_show: 'bg-sumi-soft text-white',
  cancelled: 'bg-shu text-white',
};

export function ResStatus({ id, status }: { id: string; status: string }) {
  const [cur, setCur] = useState(status as ResStatusValue);
  const [pending, start] = useTransition();
  const act = (s: ResStatusValue) => start(async () => { await setReservationStatus(id, s, cur); setCur(s); });
  return (
    <div className="flex flex-wrap gap-1">
      {RES_STATUSES.map((s) => (
        <button key={s} disabled={pending || s === cur} onClick={() => act(s)}
          className={`rounded px-2 py-1 text-xs font-semibold disabled:opacity-100 ${s === cur ? RES_STATUS_COLOR[s] : 'bg-cream-deep text-sumi-soft'}`}>
          {jaRes(s)}
        </button>
      ))}
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
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        <input type="number" value={p} onChange={(e) => setP(Number(e.target.value))} className="w-24 rounded border border-sumi/20 px-2 py-1 text-sm" />
        <button disabled={pending} onClick={() => start(async () => { await updateItemPrice(id, p); })} className="rounded bg-sumi px-2 py-1 text-xs font-semibold text-cream">保存</button>
      </div>
      <div className="flex items-center gap-1">
        <select value={so ? 'sold_out' : 'in_stock'} onChange={(e) => setSo(e.target.value === 'sold_out')} className="rounded border border-sumi/20 px-2 py-1 text-sm">
          <option value="in_stock">在庫あり</option>
          <option value="sold_out">売切中</option>
        </select>
        <button disabled={pending} onClick={() => start(async () => { await toggleSoldOut(id, so); })} className="rounded bg-sumi px-2 py-1 text-xs font-semibold text-cream">保存</button>
      </div>
      <div className="flex items-center gap-1">
        <select value={pub ? 'published' : 'unpublished'} onChange={(e) => setPub(e.target.value === 'published')} className="rounded border border-sumi/20 px-2 py-1 text-sm">
          <option value="published">公開中</option>
          <option value="unpublished">非公開</option>
        </select>
        <button disabled={pending} onClick={() => start(async () => { await togglePublished(id, pub); })} className="rounded bg-sumi px-2 py-1 text-xs font-semibold text-cream">保存</button>
      </div>
    </div>
  );
}

function jaRes(s: string) { return ({ confirmed: '確定', cancelled: '取消', completed: '来店済', no_show: '無断' } as Record<string, string>)[s] ?? s; }
function jaOrder(s: string) { return ({ received: '受付', cooking: '調理中', ready: '準備完了', picked_up: '受取済', cancelled: '取消' } as Record<string, string>)[s] ?? s; }

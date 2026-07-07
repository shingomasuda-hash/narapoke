'use client';
import { useState } from 'react';
import { OrderStatus } from './StatusButtons';
import { describeSelections } from '@/lib/order-format';
import type { TakeoutOrderRow } from '@/lib/admin-data';

export function OrderCard({ o }: { o: TakeoutOrderRow }) {
  const [open, setOpen] = useState(false);
  const time = new Date(o.pickup_at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="card space-y-1">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="font-bold text-sumi">受取 {time} ・ {o.customer_name}様</span>
        <span className="text-xs text-sumi-soft">{open ? '閉じる ▲' : '明細 ▼'}</span>
      </button>
      <p className="text-xs text-sumi-soft">{o.order_code}</p>
      <p className="text-sm"><a href={`tel:${o.phone}`} className="text-shu underline">{o.phone}</a></p>
      <p className="text-sm font-semibold">合計 ¥{o.total.toLocaleString()}（店舗支払い）</p>
      {open && (
        <div className="space-y-2 border-t border-sumi/10 pt-2 text-sm">
          {o.items.map((it, i) => {
            const detail = describeSelections(it.selections);
            return (
              <div key={i}>
                <p className="font-semibold text-sumi">
                  {it.item_name} ×{it.quantity}
                  <span className="text-xs text-sumi-soft">¥{(it.unit_price + it.options_delta).toLocaleString()}/点</span>
                </p>
                {detail.length > 0 && (
                  <ul className="ml-3 list-disc text-xs text-sumi-soft">
                    {detail.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
      <OrderStatus id={o.id} status={o.status} />
    </div>
  );
}

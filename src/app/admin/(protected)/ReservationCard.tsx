'use client';
import { useState, useTransition } from 'react';
import { ResStatus } from './StatusButtons';
import { logReservationView } from '@/actions/admin';
import type { ReservationRow } from '@/lib/admin-data';

function breakdownLabel(r: ReservationRow): string {
  const parts = [`大人${r.adult_count}`];
  if (r.child_count > 0) parts.push(`子供${r.child_count}`);
  if (r.pet_count > 0) parts.push(`ペット${r.pet_count}`);
  return parts.join('・');
}

export function ReservationCard({ r }: { r: ReservationRow }) {
  const [open, setOpen] = useState(false);
  const [, startAudit] = useTransition();
  const time = new Date(r.start_at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next) startAudit(async () => { await logReservationView(r.id); });
      return next;
    });
  }
  return (
    <div className="card space-y-1">
      <button type="button" onClick={toggle} className="flex w-full items-center justify-between text-left">
        <span className="font-bold text-sumi">{time} ・ {r.party_size}名 ・ {r.customer_name}様</span>
        <span className="text-xs text-sumi-soft">{open ? '閉じる ▲' : '詳細 ▼'}</span>
      </button>
      {open && (
        <div className="space-y-1 border-t border-sumi/10 pt-2 text-sm">
          <p className="text-xs text-sumi-soft">{r.reservation_code}</p>
          <p className="text-sumi-soft">内訳: {breakdownLabel(r)}</p>
          <p><a href={`tel:${r.phone}`} className="text-shu underline">{r.phone}</a></p>
          {r.email && <p className="text-sumi-soft">{r.email}</p>}
          {r.allergy && <p className="text-xs text-shu">アレルギー: {r.allergy}</p>}
          {r.note && <p className="text-xs text-sumi-soft">備考: {r.note}</p>}
        </div>
      )}
      <ResStatus id={r.id} status={r.status} />
    </div>
  );
}

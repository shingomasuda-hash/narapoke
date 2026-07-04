'use client';
import { useState, useTransition } from 'react';
import { addClosure, removeClosure } from '@/actions/admin';

export function ClosuresClient({ initial }: { initial: { id: string; service_date: string; reason: string }[] }) {
  const [list, setList] = useState(initial);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <label className="field-label">休業日を追加</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" />
        <input placeholder="理由（任意）" value={reason} onChange={(e) => setReason(e.target.value)} className="field-input" />
        <button disabled={pending || !date} onClick={() => start(async () => { await addClosure(date, reason); setList((l) => [...l, { id: crypto.randomUUID(), service_date: date, reason }]); setDate(''); setReason(''); })} className="btn-primary">追加する</button>
      </div>
      <div className="space-y-2">
        {list.map((c) => (
          <div key={c.id} className="card flex items-center justify-between">
            <div><p className="font-semibold text-sumi">{c.service_date}</p>{c.reason && <p className="text-xs text-sumi-soft">{c.reason}</p>}</div>
            <button onClick={() => start(async () => { await removeClosure(c.id); setList((l) => l.filter((x) => x.id !== c.id)); })} className="text-sm text-shu underline">削除</button>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';
import { useState, useTransition } from 'react';
import { updateSettings } from '@/actions/admin';
import type { StoreSettings } from '@/lib/settings';

const FIELDS: { key: keyof StoreSettings; label: string; col: string }[] = [
  { key: 'seatCapacity', label: '座席数', col: 'seat_capacity' },
  { key: 'slotMinutes', label: '予約枠(分)', col: 'slot_minutes' },
  { key: 'maxPartySize', label: '最大予約人数', col: 'max_party_size' },
  { key: 'reservationMaxDays', label: '予約可能日数', col: 'reservation_max_days' },
  { key: 'acceptCutoffMinutes', label: '受付締切(分前)', col: 'accept_cutoff_minutes' },
  { key: 'lunchStayMinutes', label: 'ランチ滞在(分)', col: 'lunch_stay_minutes' },
  { key: 'dinnerStayMinutes', label: 'ディナー滞在(分)', col: 'dinner_stay_minutes' },
  { key: 'takeoutSlotMinutes', label: 'テイクアウト枠(分)', col: 'takeout_slot_minutes' },
  { key: 'takeoutCutoffMinutes', label: 'テイクアウト締切(分前)', col: 'takeout_cutoff_minutes' },
  { key: 'takeoutSlotCapacity', label: 'テイクアウト1枠件数', col: 'takeout_slot_capacity' },
  { key: 'takeoutTaxRatePercent', label: 'テイクアウト税率(%)', col: 'takeout_tax_rate_percent' },
  { key: 'cancelDeadlineMinutes', label: 'キャンセル期限(分前)', col: 'cancel_deadline_minutes' },
];

export function SettingsClient({ initial }: { initial: StoreSettings }) {
  const [vals, setVals] = useState<Record<string, number>>(Object.fromEntries(FIELDS.map((f) => [f.col, initial[f.key] as number])));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.col}>
            <label className="field-label text-sm">{f.label}</label>
            <input type="number" value={vals[f.col]} onChange={(e) => setVals((v) => ({ ...v, [f.col]: Number(e.target.value) }))} className="field-input" />
          </div>
        ))}
      </div>
      {msg && <p className="text-sm font-semibold text-matcha">{msg}</p>}
      <button disabled={pending} onClick={() => start(async () => { const r = await updateSettings(vals); setMsg(r.ok ? '保存しました' : '保存に失敗しました'); })} className="btn-primary">保存する</button>
    </div>
  );
}

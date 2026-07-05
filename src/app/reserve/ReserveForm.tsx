'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StepHeader } from '@/components/StepHeader';
import { initLiff } from '@/lib/liff';
import { createReservationAction } from '@/actions/reservation';
import { generateIdempotencyKeyClient, isValidEmail, jpDateLabel, nextDates } from '@/lib/client-util';

interface Slot { time: string; available: boolean; remaining: number }

export function ReserveForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [closed, setClosed] = useState<string | null>(null);
  const [time, setTime] = useState('');
  const [adultCount, setAdultCount] = useState(2);
  const [childCount, setChildCount] = useState(0);
  const [petCount, setPetCount] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [hasStroller, setHasStroller] = useState(false);
  const [allergy, setAllergy] = useState('');
  const [idToken, setIdToken] = useState<string | undefined>();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const idem = useMemo(() => generateIdempotencyKeyClient(), []);
  const dates = useMemo(() => nextDates(60), []);

  // LIFF: 表示名を初期値に
  useEffect(() => {
    initLiff().then((p) => {
      if (p.displayName && !name) setName(p.displayName);
      if (p.idToken) setIdToken(p.idToken);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSlots(d: string, party: number) {
    setLoadingSlots(true);
    setClosed(null);
    try {
      const res = await fetch(`/api/availability?date=${d}&partySize=${party}`);
      const data = await res.json();
      if (data.closed) { setClosed(data.reason === 'THURSDAY' ? '木曜定休日' : '休業日'); setSlots([]); }
      else setSlots(data.slots ?? []);
    } catch {
      setError('空き状況の取得に失敗しました。通信環境をご確認ください。');
    } finally {
      setLoadingSlots(false);
    }
  }

  const occupancy = adultCount + childCount;

  function pickDate(d: string) { setDate(d); setTime(''); loadSlots(d, occupancy); setStep(2); }
  function pickTime(t: string) { setTime(t); setStep(3); }
  function confirmParty() { loadSlots(date, occupancy); setStep(4); }

  async function submit() {
    setError('');
    if (!name.trim()) return setError('お名前を入力してください。');
    if (!phone.trim()) return setError('電話番号を入力してください。');
    if (!isValidEmail(email)) return setError('メールアドレスを正しく入力してください。');
    if (!agreed) return setError('プライバシーポリシーへの同意が必要です。');
    setSubmitting(true);
    const result = await createReservationAction({
      serviceDate: date, startTime: time, adultCount, childCount, petCount,
      customerName: name.trim(), phone: phone.trim(), email, note,
      hasStroller, allergy, lineIdToken: idToken, idempotencyKey: idem,
    });
    setSubmitting(false);
    if (result.ok && result.code) {
      router.push(`/reserve/complete?code=${encodeURIComponent(result.code)}&token=${encodeURIComponent(result.token ?? '')}`);
    } else {
      setError(result.message ?? '予約に失敗しました。');
      if (result.errorCode === 'FULL') { setStep(2); loadSlots(date, occupancy); }
    }
  }

  return (
    <main>
      <Link href="/" className="mb-3 inline-block text-sm text-shu underline">← トップに戻る</Link>

      {step === 1 && (
        <>
          <StepHeader step={1} total={6} title="ご来店日を選ぶ" />
          <div className="grid grid-cols-3 gap-2">
            {dates.map((d) => (
              <button key={d.value} onClick={() => pickDate(d.value)} disabled={d.thursday}
                className={`chip flex-col !h-auto py-3 ${d.thursday ? 'opacity-30' : ''}`}>
                <span className="text-xs">{d.month}月</span>
                <span className="text-lg">{d.day}</span>
                <span className="text-xs">{d.weekday}{d.thursday ? '・休' : ''}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeader step={2} total={6} title="時間を選ぶ" />
          <p className="mb-3 text-sm text-sumi-soft">{jpDateLabel(date)}</p>
          {loadingSlots && <p className="text-sumi-soft">空き状況を確認中…</p>}
          {closed && <p className="font-semibold text-shu">{closed}のためご予約いただけません。</p>}
          <div className="grid grid-cols-3 gap-2">
            {slots.map((s) => (
              <button key={s.time} onClick={() => s.available && pickTime(s.time)} disabled={!s.available}
                className={`chip ${!s.available ? 'opacity-30 line-through' : ''} ${time === s.time ? 'chip-on' : ''}`}>
                {s.time}
              </button>
            ))}
          </div>
          {!loadingSlots && !closed && slots.length === 0 && (
            <p className="text-sumi-soft">この日は予約可能な時間がありません。</p>
          )}
          <button onClick={() => setStep(1)} className="btn-outline mt-4">日付を選び直す</button>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeader step={3} total={6} title="人数を選ぶ" />
          <div className="space-y-4">
            <Counter label="大人" value={adultCount} min={1} max={20} onChange={setAdultCount} />
            <Counter label="子供" value={childCount} min={0} max={20} onChange={setChildCount} />
            <Counter label="ペット" value={petCount} min={0} max={10} onChange={setPetCount} />
          </div>
          <p className="mt-3 text-sm font-semibold text-sumi">合計 {occupancy}名{petCount > 0 ? `・ペット${petCount}` : ''}</p>
          <p className="mt-2 rounded-xl bg-cream-deep p-3 text-sm text-sumi-soft">
            9名以上のご予約は、お手数ですが店舗へ直接ご相談ください。
          </p>
          <button onClick={confirmParty} className="btn-primary mt-4">次へ</button>
          <button onClick={() => setStep(2)} className="btn-outline mt-2">時間を選び直す</button>
        </>
      )}

      {step === 4 && (
        <>
          <StepHeader step={4} total={6} title="お客様情報を入力" />
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="field-label">お名前 <span className="text-shu">必須</span></label>
              <input id="name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <div>
              <label htmlFor="phone" className="field-label">電話番号 <span className="text-shu">必須</span></label>
              <input id="phone" type="tel" inputMode="tel" className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="09012345678" />
            </div>
            <div>
              <label htmlFor="email" className="field-label">メールアドレス <span className="text-shu">必須</span></label>
              <input id="email" type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            {childCount > 0 && (
              <div>
                <span className="field-label">ベビーカー</span>
                <button type="button" onClick={() => setHasStroller(!hasStroller)} className={`chip w-full ${hasStroller ? 'chip-on' : ''}`}>{hasStroller ? 'あり' : 'なし'}</button>
              </div>
            )}
            <div>
              <label htmlFor="allergy" className="field-label">アレルギー等の連絡事項（任意）</label>
              <textarea id="allergy" className="field-input py-2" rows={2} value={allergy} onChange={(e) => setAllergy(e.target.value)} />
            </div>
            <div>
              <label htmlFor="note" className="field-label">備考（任意）</label>
              <textarea id="note" className="field-input py-2" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <button onClick={() => {
            if (!name.trim() || !phone.trim()) { setError('お名前と電話番号は必須です。'); return; }
            if (!isValidEmail(email)) { setError('メールアドレスを正しく入力してください。'); return; }
            setError(''); setStep(5);
          }} className="btn-primary mt-5">入力内容を確認する</button>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button onClick={() => setStep(3)} className="btn-outline mt-2">人数選択に戻る</button>
        </>
      )}

      {step === 5 && (
        <>
          <StepHeader step={5} total={6} title="内容を確認" />
          <dl className="card space-y-2 text-sm">
            <Row k="日付" v={jpDateLabel(date)} />
            <Row k="時間" v={time} />
            <Row k="人数" v={`${occupancy}名（大人${adultCount}${childCount > 0 ? `・子供${childCount}` : ''}${petCount > 0 ? `・ペット${petCount}` : ''}）`} />
            <Row k="お名前" v={name} />
            <Row k="電話番号" v={phone} />
            {email && <Row k="メール" v={email} />}
            {hasStroller && <Row k="ベビーカー" v="あり" />}
            {allergy && <Row k="連絡事項" v={allergy} />}
            {note && <Row k="備考" v={note} />}
          </dl>
          <p className="mt-3 text-xs text-sumi-soft">お支払いは店舗にてお願いいたします。</p>
          <label className="mt-4 flex items-start gap-2 text-sm text-sumi">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
            <span>
              ご入力いただいた情報は予約管理・ご連絡・店舗運営の目的で利用します。
              <Link href="/privacy" target="_blank" className="text-shu underline">プライバシーポリシー</Link>
              に同意する
            </span>
          </label>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button onClick={submit} disabled={submitting || !agreed} className="btn-primary mt-4">
            {submitting ? '送信中…' : 'この内容で予約する'}
          </button>
          <button onClick={() => setStep(4)} className="btn-outline mt-2">入力に戻る</button>
        </>
      )}
    </main>
  );
}

function Counter({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="field-label !mb-0">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="chip !min-h-0 h-10 w-10 !px-0 disabled:opacity-30">−</button>
        <span className="w-8 text-center font-semibold text-sumi">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="chip !min-h-0 h-10 w-10 !px-0 disabled:opacity-30">＋</button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-sumi-soft">{k}</dt>
      <dd className="text-right font-semibold text-sumi">{v}</dd>
    </div>
  );
}

'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StepHeader } from '@/components/StepHeader';
import { initLiff } from '@/lib/liff';
import { createTakeoutAction } from '@/actions/takeout';
import { generateIdempotencyKeyClient, jpDateLabel, nextDates } from '@/lib/client-util';

interface MItem { code: string; name: string; price: number; soldOut: boolean; category: string; meta?: { mainCount?: number; subCount?: number } }
interface Opt { code: string; name: string; extra: number }
interface CartLine { key: string; itemCode: string; name: string; unitPrice: number; optionsDelta: number; quantity: number; selections: Record<string, string[]> }

const FRUITS: Opt[] = [
  { code: 'mango', name: 'マンゴー', extra: 0 }, { code: 'ichigo', name: 'いちご', extra: 0 },
  { code: 'blueberry', name: 'ブルーベリー', extra: 0 }, { code: 'banana', name: 'バナナ', extra: 0 },
  { code: 'ringo', name: 'りんご(3種目+80)', extra: 80 }, { code: 'mikan', name: 'みかん(3種目+100)', extra: 100 },
  { code: 'kiwi', name: 'キウイ(3種目+100)', extra: 100 },
];
const VEG: Opt[] = [
  { code: 'spinach', name: 'ほうれん草', extra: 0 }, { code: 'celery', name: 'セロリ', extra: 0 },
  { code: 'basil', name: 'バジル', extra: 0 }, { code: 'komatsuna', name: '小松菜', extra: 0 },
];

export function TakeoutForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [menu, setMenu] = useState<{ categories: { code: string; name: string }[]; items: MItem[]; mains: Opt[]; subs: Opt[] } | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [editing, setEditing] = useState<MItem | null>(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [allergy, setAllergy] = useState('');
  const [idToken, setIdToken] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const idem = useMemo(() => generateIdempotencyKeyClient(), []);
  const dates = useMemo(() => nextDates(14), []);

  useEffect(() => { fetch('/api/menu').then((r) => r.json()).then(setMenu).catch(() => setError('メニューの取得に失敗しました。')); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { initLiff().then((p) => { if (p.displayName && !name) setName(p.displayName); if (p.idToken) setIdToken(p.idToken); }); }, []);

  const estTotal = cart.reduce((a, l) => a + (l.unitPrice + l.optionsDelta) * l.quantity, 0);

  function addSimple(it: MItem) {
    setCart((c) => [...c, { key: crypto.randomUUID(), itemCode: it.code, name: it.name, unitPrice: it.price, optionsDelta: 0, quantity: 1, selections: {} }]);
  }
  function removeLine(key: string) { setCart((c) => c.filter((l) => l.key !== key)); }
  function setQty(key: string, q: number) { setCart((c) => c.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, q) } : l))); }

  async function loadSlots(d: string) {
    const r = await fetch(`/api/takeout-slots?date=${d}`); const data = await r.json();
    setSlots(data.slots ?? []);
  }

  async function submit() {
    setError('');
    if (cart.length === 0) return setError('商品を選択してください。');
    if (!time) return setError('受取時間を選択してください。');
    if (!name.trim() || !phone.trim()) return setError('お名前と電話番号は必須です。');
    setSubmitting(true);
    const result = await createTakeoutAction({
      pickupDate: date, pickupTime: time,
      items: cart.map((l) => ({ itemCode: l.itemCode, quantity: l.quantity, selections: l.selections })),
      customerName: name.trim(), phone: phone.trim(), email, note, allergy,
      lineIdToken: idToken, idempotencyKey: idem,
    });
    setSubmitting(false);
    if (result.ok && result.code) {
      router.push(`/takeout/complete?code=${encodeURIComponent(result.code)}&token=${encodeURIComponent(result.token ?? '')}&total=${result.totals?.total ?? ''}`);
    } else {
      setError(result.message ?? '注文に失敗しました。');
    }
  }

  if (!menu) return <main><p className="text-sumi-soft">読み込み中…</p></main>;

  return (
    <main>
      <Link href="/" className="mb-3 inline-block text-sm text-shu underline">← トップに戻る</Link>

      {step === 1 && (
        <>
          <StepHeader step={1} total={4} title="商品を選ぶ" />
          {menu.categories.map((cat) => {
            const items = menu.items.filter((i) => i.category === cat.code);
            if (items.length === 0) return null;
            return (
              <section key={cat.code} className="mb-5">
                <h2 className="mb-2 font-serif text-lg font-bold text-sumi">{cat.name}</h2>
                <div className="space-y-2">
                  {items.map((it) => (
                    <div key={it.code} className="card flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sumi">{it.name}</p>
                        <p className="text-sm text-sumi-soft">¥{it.price.toLocaleString()}（税込）{it.soldOut && ' ・売切'}</p>
                      </div>
                      <button disabled={it.soldOut}
                        onClick={() => (it.category === 'plan' || it.code === 'poke_drink_single' ? setEditing(it) : addSimple(it))}
                        className={`chip ${it.soldOut ? 'opacity-30' : 'chip-on'}`}>追加</button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {cart.length > 0 && (
            <div className="sticky bottom-2 mt-4">
              <button onClick={() => setStep(2)} className="btn-primary">
                カートを見る（{cart.length}点・¥{estTotal.toLocaleString()}）
              </button>
            </div>
          )}
          {error && <p className="error-text" role="alert">{error}</p>}
        </>
      )}

      {step === 2 && (
        <>
          <StepHeader step={2} total={4} title="カートの確認" />
          <div className="space-y-2">
            {cart.map((l) => (
              <div key={l.key} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sumi">{l.name}</p>
                    {Object.entries(l.selections).map(([g, arr]) => arr.length > 0 && (
                      <p key={g} className="text-xs text-sumi-soft">{g}: {arr.join('・')}</p>
                    ))}
                    <p className="text-sm text-sumi-soft">¥{(l.unitPrice + l.optionsDelta).toLocaleString()}（税込）</p>
                  </div>
                  <button onClick={() => removeLine(l.key)} className="text-sm text-shu underline">削除</button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => setQty(l.key, l.quantity - 1)} className="chip !min-h-0 h-9 w-9 !px-0">−</button>
                  <span className="w-8 text-center font-semibold">{l.quantity}</span>
                  <button onClick={() => setQty(l.key, l.quantity + 1)} className="chip !min-h-0 h-9 w-9 !px-0">＋</button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-right text-sm text-sumi-soft">小計（税込・目安）: ¥{estTotal.toLocaleString()}</p>
          <p className="text-right text-xs text-sumi-soft">最終金額は確認画面でご確認ください</p>
          <button onClick={() => { setStep(3); if (date) loadSlots(date); }} className="btn-primary mt-4">受取日時へ進む</button>
          <button onClick={() => setStep(1)} className="btn-outline mt-2">商品を追加する</button>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeader step={3} total={4} title="受取日時を選ぶ" />
          <p className="field-label">受取日</p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {dates.map((d) => (
              <button key={d.value} disabled={d.thursday} onClick={() => { setDate(d.value); setTime(''); loadSlots(d.value); }}
                className={`chip flex-col !h-auto py-2 ${d.thursday ? 'opacity-30' : ''} ${date === d.value ? 'chip-on' : ''}`}>
                <span className="text-xs">{d.month}/{d.day}</span><span className="text-xs">{d.weekday}</span>
              </button>
            ))}
          </div>
          {date && (
            <>
              <p className="field-label">受取時間</p>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s) => (
                  <button key={s.time} disabled={!s.available} onClick={() => setTime(s.time)}
                    className={`chip ${!s.available ? 'opacity-30 line-through' : ''} ${time === s.time ? 'chip-on' : ''}`}>{s.time}</button>
                ))}
              </div>
            </>
          )}
          <button onClick={() => { if (!date || !time) { setError('受取日時を選択してください。'); return; } setError(''); setStep(4); }} className="btn-primary mt-4">お客様情報へ</button>
          {error && <p className="error-text" role="alert">{error}</p>}
        </>
      )}

      {step === 4 && (
        <>
          <StepHeader step={4} total={4} title="お客様情報・確認" />
          <div className="space-y-4">
            <div><label htmlFor="tn" className="field-label">お名前 <span className="text-shu">必須</span></label>
              <input id="tn" className="field-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
            <div><label htmlFor="tp" className="field-label">電話番号 <span className="text-shu">必須</span></label>
              <input id="tp" type="tel" inputMode="tel" className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></div>
            <div><label htmlFor="te" className="field-label">メール（任意）</label>
              <input id="te" type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label htmlFor="ta" className="field-label">アレルギー等（任意）</label>
              <textarea id="ta" className="field-input py-2" rows={2} value={allergy} onChange={(e) => setAllergy(e.target.value)} /></div>
            <div><label htmlFor="tno" className="field-label">備考（任意）</label>
              <textarea id="tno" className="field-input py-2" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
          <div className="card mt-4 text-sm">
            <p>受取: {jpDateLabel(date)} {time}</p>
            <p>点数: {cart.length}点</p>
            <p className="text-sumi-soft">お支払い: 店舗支払い</p>
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button onClick={submit} disabled={submitting} className="btn-primary mt-4">{submitting ? '送信中…' : 'この内容で注文する'}</button>
          <button onClick={() => setStep(3)} className="btn-outline mt-2">戻る</button>
        </>
      )}

      {editing && (
        <CustomizeSheet item={editing} mains={menu.mains} subs={menu.subs}
          onClose={() => setEditing(null)}
          onAdd={(line) => { setCart((c) => [...c, line]); setEditing(null); }} />
      )}
    </main>
  );
}

/** プラン(メイン/サブ) / ならポケドリンク(フルーツ/野菜) のカスタマイズシート */
function CustomizeSheet({ item, mains, subs, onClose, onAdd }: {
  item: MItem; mains: Opt[]; subs: Opt[];
  onClose: () => void; onAdd: (l: CartLine) => void;
}) {
  const isPoke = item.code === 'poke_drink_single';
  const [selMains, setSelMains] = useState<string[]>([]);
  const [selSubs, setSelSubs] = useState<string[]>([]);
  const [selFruits, setSelFruits] = useState<string[]>([]);
  const [selVeg, setSelVeg] = useState<string[]>([]);
  const [err, setErr] = useState('');

  const needMain = item.meta?.mainCount ?? 0;
  const needSub = item.meta?.subCount ?? 0;

  function toggle(list: string[], set: (v: string[]) => void, code: string, max: number) {
    if (list.includes(code)) set(list.filter((c) => c !== code));
    else if (list.length < max) set([...list, code]);
  }

  function confirm() {
    const selections: Record<string, string[]> = {};
    let delta = 0;
    if (!isPoke) {
      if (selMains.length !== needMain) return setErr(`メインを${needMain}種類選んでください`);
      if (selSubs.length !== needSub) return setErr(`サブを${needSub}種類選んでください`);
      selections.mains = selMains; selections.subs = selSubs;
      delta += mains.filter((m) => selMains.includes(m.code)).reduce((a, m) => a + m.extra, 0);
      delta += subs.filter((s) => selSubs.includes(s.code)).reduce((a, s) => a + s.extra, 0);
    } else {
      if (selFruits.length < 2) return setErr('フルーツは2種類以上選んでください');
      if (selFruits.length + selVeg.length !== 4) return setErr('フルーツと野菜あわせて4種類選んでください');
      selections.fruits = selFruits; selections.vegetables = selVeg;
      // 3種類目フルーツのみ追加（並び順の3番目）
      if (selFruits.length === 3) delta += FRUITS.find((f) => f.code === selFruits[2])?.extra ?? 0;
    }
    onAdd({ key: crypto.randomUUID(), itemCode: item.code, name: item.name, unitPrice: item.price, optionsDelta: delta, quantity: 1, selections });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-xl2 bg-cream p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-serif text-lg font-bold text-sumi">{item.name} をカスタマイズ</h3>
        {!isPoke ? (
          <>
            <p className="field-label">メイン（{needMain}種類） {selMains.length}/{needMain}</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {mains.map((m) => (
                <button key={m.code} onClick={() => toggle(selMains, setSelMains, m.code, needMain)}
                  className={`chip ${selMains.includes(m.code) ? 'chip-on' : ''}`}>{m.name}{m.extra > 0 ? `+${m.extra}` : ''}</button>
              ))}
            </div>
            <p className="field-label">サブ（{needSub}種類） {selSubs.length}/{needSub}</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {subs.map((s) => (
                <button key={s.code} onClick={() => toggle(selSubs, setSelSubs, s.code, needSub)}
                  className={`chip ${selSubs.includes(s.code) ? 'chip-on' : ''}`}>{s.name}{s.extra > 0 ? `+${s.extra}` : ''}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="field-label">フルーツ（2〜3種） {selFruits.length}</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {FRUITS.map((f) => (
                <button key={f.code} onClick={() => toggle(selFruits, setSelFruits, f.code, 3)}
                  className={`chip ${selFruits.includes(f.code) ? 'chip-on' : ''}`}>{f.name}</button>
              ))}
            </div>
            <p className="field-label">野菜 {selVeg.length}</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {VEG.map((v) => (
                <button key={v.code} onClick={() => toggle(selVeg, setSelVeg, v.code, 2)}
                  className={`chip ${selVeg.includes(v.code) ? 'chip-on' : ''}`}>{v.name}</button>
              ))}
            </div>
          </>
        )}
        {err && <p className="error-text" role="alert">{err}</p>}
        <button onClick={confirm} className="btn-primary mt-2">カートに追加</button>
        <button onClick={onClose} className="btn-outline mt-2">閉じる</button>
      </div>
    </div>
  );
}

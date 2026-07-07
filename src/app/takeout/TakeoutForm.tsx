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
interface CartLine {
  key: string; itemCode: string; name: string; unitPrice: number; optionsDelta: number; quantity: number;
  selections: Record<string, string[]>;
  /** カート確認画面に表示するための補足（例: サブ追加分）。サーバーへは送らない。 */
  note?: string;
}
interface MenuData {
  categories: { code: string; name: string }[]; items: MItem[];
  mains: Opt[]; subs: Opt[]; fruitVeg: Opt[]; toppings: Opt[]; planSauce: Opt[]; planAddon: Opt[];
}

const SUB_EXCESS_FEE_PER_ITEM = 100;

export function TakeoutForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [menu, setMenu] = useState<MenuData | null>(null);
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
  const [agreed, setAgreed] = useState(false);
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
    if (!agreed) return setError('プライバシーポリシーへの同意が必要です。');
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
                    {l.note && <p className="text-xs text-shu">{l.note}</p>}
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
          <label className="mt-4 flex items-start gap-2 text-sm text-sumi">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
            <span>
              ご入力いただいた情報は注文管理・ご連絡・店舗運営の目的で利用します。
              <Link href="/privacy" target="_blank" className="text-shu underline">プライバシーポリシー</Link>
              に同意する
            </span>
          </label>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button onClick={submit} disabled={submitting || !agreed} className="btn-primary mt-4">{submitting ? '送信中…' : 'この内容で注文する'}</button>
          <button onClick={() => setStep(3)} className="btn-outline mt-2">戻る</button>
        </>
      )}

      {editing && (
        <CustomizeSheet item={editing} menu={menu}
          onClose={() => setEditing(null)}
          onAdd={(line) => { setCart((c) => [...c, line]); setEditing(null); }} />
      )}
    </main>
  );
}

/** プラン(メイン/サブ/ソース/追加オプション) / ならポケドリンク(フルーツ野菜/トッピング) のカスタマイズシート */
function CustomizeSheet({ item, menu, onClose, onAdd }: {
  item: MItem; menu: MenuData;
  onClose: () => void; onAdd: (l: CartLine) => void;
}) {
  const isPoke = item.code === 'poke_drink_single';
  const [selMains, setSelMains] = useState<string[]>([]);
  const [selSubs, setSelSubs] = useState<string[]>([]);
  const [selSauce, setSelSauce] = useState<string>('');
  const [selAddons, setSelAddons] = useState<string[]>([]);
  const [selFruitVeg, setSelFruitVeg] = useState<string[]>([]);
  const [selToppings, setSelToppings] = useState<string[]>([]);
  const [err, setErr] = useState('');

  const needMain = item.meta?.mainCount ?? 0;
  const needSub = item.meta?.subCount ?? 0;
  const subExcessCount = Math.max(0, selSubs.length - needSub);
  const subExcessFee = subExcessCount * SUB_EXCESS_FEE_PER_ITEM;

  function toggle(list: string[], set: (v: string[]) => void, code: string, max: number) {
    if (list.includes(code)) set(list.filter((c) => c !== code));
    else if (list.length < max) set([...list, code]);
  }

  function confirm() {
    const selections: Record<string, string[]> = {};
    let delta = 0;
    let noteText: string | undefined;
    if (!isPoke) {
      if (selMains.length !== needMain) return setErr(`メインを${needMain}種類選んでください`);
      if (selSubs.length < needSub) return setErr(`サブを${needSub}種類以上選んでください`);
      if (!selSauce) return setErr('ソースを選んでください');
      selections.mains = selMains;
      selections.subs = selSubs;
      selections.sauce = [selSauce];
      if (selAddons.length > 0) selections.planAddon = selAddons;
      delta += menu.mains.filter((m) => selMains.includes(m.code)).reduce((a, m) => a + m.extra, 0);
      delta += menu.subs.filter((s) => selSubs.includes(s.code)).reduce((a, s) => a + s.extra, 0);
      delta += menu.planSauce.filter((s) => selSauce === s.code).reduce((a, s) => a + s.extra, 0);
      delta += menu.planAddon.filter((a) => selAddons.includes(a.code)).reduce((a, x) => a + x.extra, 0);
      delta += subExcessFee;
      if (subExcessCount > 0) noteText = `サブ追加分 ×${subExcessCount}（+¥${subExcessFee.toLocaleString()}）`;
    } else {
      if (selFruitVeg.length !== 3) return setErr('フルーツ・野菜をあわせて3種類選んでください');
      selections.fruitVeg = selFruitVeg;
      if (selToppings.length > 0) selections.toppings = selToppings;
      delta += menu.fruitVeg.filter((f) => selFruitVeg.includes(f.code)).reduce((a, f) => a + f.extra, 0);
      delta += menu.toppings.filter((t) => selToppings.includes(t.code)).reduce((a, t) => a + t.extra, 0);
    }
    onAdd({ key: crypto.randomUUID(), itemCode: item.code, name: item.name, unitPrice: item.price, optionsDelta: delta, quantity: 1, selections, note: noteText });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-xl2 bg-cream p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-serif text-lg font-bold text-sumi">{item.name} をカスタマイズ</h3>
        {!isPoke ? (
          <>
            <p className="field-label">メイン（{needMain}種類） {selMains.length}/{needMain}</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {menu.mains.map((m) => (
                <button key={m.code} onClick={() => toggle(selMains, setSelMains, m.code, needMain)}
                  className={`chip ${selMains.includes(m.code) ? 'chip-on' : ''}`}>{m.name}{m.extra > 0 ? `+${m.extra}` : ''}</button>
              ))}
            </div>
            <p className="field-label">サブ（{needSub}種類以上、超過分は1つ+{SUB_EXCESS_FEE_PER_ITEM}円） {selSubs.length}/{needSub}以上</p>
            <div className="mb-1 flex flex-wrap gap-2">
              {menu.subs.map((s) => (
                <button key={s.code} onClick={() => toggle(selSubs, setSelSubs, s.code, menu.subs.length)}
                  className={`chip ${selSubs.includes(s.code) ? 'chip-on' : ''}`}>{s.name}{s.extra > 0 ? `+${s.extra}` : ''}</button>
              ))}
            </div>
            {subExcessCount > 0 && (
              <p className="mb-4 text-sm font-semibold text-shu">サブ追加分 ×{subExcessCount}（+¥{subExcessFee.toLocaleString()}）</p>
            )}
            <p className="field-label">ソース選択（必須）</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {menu.planSauce.map((s) => (
                <button key={s.code} onClick={() => setSelSauce(s.code)}
                  className={`chip ${selSauce === s.code ? 'chip-on' : ''}`}>{s.name}</button>
              ))}
            </div>
            <p className="field-label">追加オプション（任意）</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {menu.planAddon.map((a) => (
                <button key={a.code} onClick={() => toggle(selAddons, setSelAddons, a.code, menu.planAddon.length)}
                  className={`chip ${selAddons.includes(a.code) ? 'chip-on' : ''}`}>{a.name}{a.extra > 0 ? `+${a.extra}` : ''}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="field-label">フルーツ・野菜（あわせて3種類） {selFruitVeg.length}/3</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {menu.fruitVeg.map((f) => (
                <button key={f.code} onClick={() => toggle(selFruitVeg, setSelFruitVeg, f.code, 3)}
                  className={`chip ${selFruitVeg.includes(f.code) ? 'chip-on' : ''}`}>{f.name}{f.extra > 0 ? `+${f.extra}` : ''}</button>
              ))}
            </div>
            <p className="field-label">追加トッピング（任意）</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {menu.toppings.map((t) => (
                <button key={t.code} onClick={() => toggle(selToppings, setSelToppings, t.code, menu.toppings.length)}
                  className={`chip ${selToppings.includes(t.code) ? 'chip-on' : ''}`}>{t.name}{t.extra > 0 ? `+${t.extra}` : ''}</button>
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

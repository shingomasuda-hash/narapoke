import Link from 'next/link';
import { env } from '@/lib/config';
export const metadata = { title: 'ご注文完了｜なら和ポケ日和' };

export default function TakeoutComplete({ searchParams }: { searchParams: { code?: string; token?: string; total?: string } }) {
  const { code = '', token = '', total = '' } = searchParams;
  return (
    <main className="space-y-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-shu text-2xl text-cream">✓</div>
      <h1 className="font-serif text-2xl font-bold text-sumi">ご注文を承りました</h1>
      <div className="card text-left">
        <p className="text-sm text-sumi-soft">注文番号</p>
        <p className="font-serif text-2xl font-bold tracking-wider text-shu">{code}</p>
        {total && <p className="mt-2 text-sm">合計 <span className="font-bold">¥{Number(total).toLocaleString()}</span>（税込・店舗支払い）</p>}
      </div>
      <p className="text-sm text-sumi-soft">受取時間までにご準備いたします。変更・キャンセルは下記から行えます（調理開始前まで）。</p>
      {token && <Link href={`/booking/${token}`} className="btn-primary">注文内容を確認・変更する</Link>}
      <a
        href={env.lineAddFriendUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-full bg-[#06C755] px-6 py-3 font-bold text-white shadow hover:opacity-90"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true"><path d="M12 2C6.48 2 2 6.02 2 11c0 3.27 1.74 6.16 4.4 7.94-.12.44-.77 2.82-.88 3.22-.14.5.18.5.37.37.15-.1 2.44-1.62 3.43-2.28.67.09 1.37.14 2.08.14 5.52 0 10-4.02 10-9S17.52 2 12 2Z"/></svg>
        LINEで最新情報を受け取る
      </a>
      <Link href="/" className="btn-outline">トップに戻る</Link>
    </main>
  );
}

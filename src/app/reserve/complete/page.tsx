import Link from 'next/link';
import { env } from '@/lib/config';

export const metadata = { title: 'ご予約完了｜なら和ポケ日和' };

export default function ReserveComplete({ searchParams }: { searchParams: { code?: string; token?: string } }) {
  const code = searchParams.code ?? '';
  const token = searchParams.token ?? '';
  return (
    <main className="space-y-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-shu text-2xl text-cream">✓</div>
      <h1 className="font-serif text-2xl font-bold text-sumi">ご予約が完了しました</h1>
      <div className="card text-left">
        <p className="text-sm text-sumi-soft">予約番号</p>
        <p className="font-serif text-2xl font-bold tracking-wider text-shu">{code}</p>
      </div>
      <p className="text-sm text-sumi-soft">
        ご予約の確認・変更・キャンセルは下記のページから行えます。このURLは大切に保管してください。
      </p>
      {token && (
        <Link href={`/booking/${token}`} className="btn-primary">予約内容を確認・変更する</Link>
      )}
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
      <p className="text-xs text-sumi-soft">お支払いは店舗にてお願いいたします。</p>
    </main>
  );
}

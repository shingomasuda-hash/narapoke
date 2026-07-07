import Image from 'next/image';
import Link from 'next/link';
import { loadPublicStoreInfo } from '@/lib/public-data';

export const dynamic = 'force-dynamic';

export default async function TopPage() {
  const info = await loadPublicStoreInfo();
  const today = new Date();
  const weekday = new Intl.DateTimeFormat('ja-JP', { weekday: 'short', timeZone: 'Asia/Tokyo' }).format(today);
  const isThu = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Tokyo' }).format(today) === 'Thu';

  return (
    <main className="space-y-6">
      <header className="text-center">
        <p className="text-sm tracking-widest text-shu">NARA WA POKE BIYORI</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-sumi">なら和ポケ日和</h1>
        <p className="mt-2 text-sm text-sumi-soft">奈良の和モダン・ポケ専門店</p>
      </header>

      {/* 店舗ヒーロー画像 */}
      <div className="overflow-hidden rounded-xl2 border border-sumi/10">
        <Image
          src="/nara-logo.png"
          alt="なら和ポケ日和"
          width={3300}
          height={2334}
          priority
          sizes="(max-width: 448px) 100vw, 448px"
          className="h-auto w-full"
        />
      </div>

      {/* 2つの大きな選択肢 */}
      <div className="space-y-3">
        <Link href="/reserve" className="btn-primary" aria-label="席を予約する">
          🍽 席を予約する
        </Link>
        <Link href="/takeout" className="btn-outline" aria-label="テイクアウトを予約する">
          🥡 テイクアウトを予約する
        </Link>
      </div>

      {/* 店舗情報 */}
      <section className="card space-y-2 text-sm text-sumi">
        <h2 className="font-serif text-lg font-bold">本日の営業時間</h2>
        {isThu ? (
          <p className="font-semibold text-shu">本日（{weekday}）は定休日です</p>
        ) : (
          <p>ランチ 11:00〜16:00 ／ ディナー 18:00〜24:00</p>
        )}
        <p className="text-sumi-soft">定休日：毎週木曜日</p>
        <a href={info.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-block font-semibold text-shu underline">
          Instagram を見る
        </a>
      </section>

      {/* お知らせ */}
      {info.announcements.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-serif text-lg font-bold text-sumi">店舗からのお知らせ</h2>
          <ul className="space-y-2">
            {info.announcements.map((a) => (
              <li key={a.id} className="text-sm">
                <p className="font-semibold text-sumi">{a.title}</p>
                <p className="text-sumi-soft">{a.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 予約変更・キャンセル導線 */}
      <p className="text-center text-sm text-sumi-soft">
        ご予約の確認・変更・キャンセルは、予約完了時にお送りするURLから行えます。
      </p>

      <nav className="flex justify-center gap-4 text-xs text-sumi-soft">
        <Link href="/privacy" className="underline">プライバシーポリシー</Link>
        <Link href="/terms" className="underline">ご利用上の注意</Link>
      </nav>
    </main>
  );
}

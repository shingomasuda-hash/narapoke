export const metadata = { title: 'ご利用上の注意｜なら和ポケ日和' };
export default function Terms() {
  return (
    <main className="space-y-4 text-sm leading-relaxed text-sumi">
      <h1 className="font-serif text-xl font-bold">ご利用上の注意</h1>
      <ul className="list-disc space-y-2 pl-5">
        <li>ご予約は当日から60日先まで承ります（変更される場合があります）。</li>
        <li>毎週木曜日は定休日です。ランチ 11:00〜16:00、ディナー 18:00〜24:00 の営業です。</li>
        <li>お支払いは店舗にてお願いいたします（オンライン決済は現在ご利用いただけません）。</li>
        <li>9名以上のご予約は店舗へ直接ご相談ください。</li>
        <li>テイクアウトのキャンセルは調理開始前まで承ります。</li>
        <li>ご予約時間を大幅に過ぎる場合は、恐れ入りますが店舗へご連絡ください。</li>
      </ul>
    </main>
  );
}

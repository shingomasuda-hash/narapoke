export const metadata = { title: 'プライバシーポリシー｜なら和ポケ日和' };
export default function Privacy() {
  return (
    <main className="space-y-4 text-sm leading-relaxed text-sumi">
      <h1 className="font-serif text-xl font-bold">プライバシーポリシー</h1>

      <section>
        <h2 className="font-semibold text-sumi">事業者</h2>
        <p>株式会社anyware（運営店舗：なら和ポケ日和、以下「当店」）</p>
      </section>

      <section>
        <h2 className="font-semibold text-sumi">取得する情報</h2>
        <p>当店は、席予約・テイクアウト注文の受付にあたり、以下の情報を取得します。</p>
        <ul className="list-disc pl-5">
          <li>氏名</li>
          <li>メールアドレス</li>
          <li>電話番号</li>
          <li>予約・注文内容（日時、人数、メニュー等）</li>
          <li>アレルギー情報等の連絡事項</li>
          <li>LINEご利用時の識別子（LINEユーザーID）</li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-sumi">利用目的</h2>
        <p>取得した情報は、以下の目的の範囲内でのみ利用します。</p>
        <ul className="list-disc pl-5">
          <li>予約・注文の管理</li>
          <li>お客様へのご連絡（確認・変更・キャンセル・リマインド等）</li>
          <li>店舗運営（来店対応、品質改善等）</li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-sumi">第三者提供</h2>
        <p>取得した個人情報は、法令に基づく場合を除き、ご本人の同意なく第三者へ提供しません。</p>
      </section>

      <section>
        <h2 className="font-semibold text-sumi">保管期間</h2>
        <p className="font-semibold text-shu">【要確定】保管期間は運用開始前に当店にて定めます。</p>
      </section>

      <section>
        <h2 className="font-semibold text-sumi">開示・訂正・削除等のご請求、お問い合わせ先</h2>
        <p className="font-semibold text-shu">【要確定】お問い合わせ先は運用開始前に当店にて定めます。</p>
      </section>

      <p className="text-sumi-soft">※本ページのうち【要確定】と記載の項目は、運用開始前に確定してください。</p>
    </main>
  );
}

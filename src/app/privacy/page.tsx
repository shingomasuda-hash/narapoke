export const metadata = { title: 'プライバシーポリシー｜なら和ポケ日和' };
export default function Privacy() {
  return (
    <main className="space-y-4 text-sm leading-relaxed text-sumi">
      <h1 className="font-serif text-xl font-bold">プライバシーポリシー</h1>
      <p>なら和ポケ日和（以下「当店」）は、予約・注文の受付に必要な範囲でお客様の個人情報（お名前・電話番号・メールアドレス・LINE識別子等）を取得し、予約管理・ご連絡・店舗運営の目的にのみ利用します。</p>
      <p>取得した個人情報は法令に基づく場合を除き、ご本人の同意なく第三者へ提供しません。保管期間は運用開始前に当店にて定めます（README 参照）。</p>
      <p>開示・訂正・削除等のご請求は、当店までお問い合わせください。</p>
      <p className="text-sumi-soft">※ 本文は雛形です。運用開始前に事業者情報・保管期間・問い合わせ先を確定してください。</p>
    </main>
  );
}

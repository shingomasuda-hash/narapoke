import { MfaEnrollClient } from './MfaEnrollClient';

export const dynamic = 'force-dynamic';

export default function AdminSecurity() {
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-xl font-bold text-sumi">セキュリティ（2段階認証）</h1>
      <p className="text-sm text-sumi-soft">
        ログイン時にパスワードに加えて認証アプリの確認コードを求めることで、アカウントの安全性を高めます。
        現時点では登録は任意です。登録して動作確認ができ次第、必須化を検討します。
      </p>
      <MfaEnrollClient />
    </div>
  );
}

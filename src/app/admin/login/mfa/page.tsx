import { MfaChallengeForm } from './MfaChallengeForm';
export const metadata = { title: '2段階認証｜管理者ログイン' };
export default function Page() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center px-4">
      <div className="w-full">
        <h1 className="mb-4 text-center font-serif text-xl font-bold text-sumi">2段階認証</h1>
        <MfaChallengeForm />
      </div>
    </div>
  );
}

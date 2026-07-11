import Link from 'next/link';
import { useMockData } from '@/lib/config';
import { createSupabaseServer } from '@/lib/supabase/server';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata = { title: 'パスワード再設定' };
export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage() {
  const hasSession = useMockData || Boolean((await createSupabaseServer().auth.getUser()).data.user);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center px-4">
      <div className="w-full">
        <h1 className="mb-4 text-center font-serif text-xl font-bold text-sumi">パスワード再設定</h1>
        {hasSession ? (
          <ResetPasswordForm />
        ) : (
          <div className="space-y-4">
            <p className="error-text" role="alert">リンクが無効か、有効期限が切れています。再度パスワードリセットをお試しください。</p>
            <Link href="/admin/login" className="btn-outline">ログイン画面へ戻る</Link>
          </div>
        )}
      </div>
    </div>
  );
}

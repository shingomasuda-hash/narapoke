/** 管理者ガード: ログイン済み かつ admins テーブルに存在するユーザーのみ許可。 */
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';
import { useMockData } from '@/lib/config';

export async function requireAdmin(): Promise<{ id: string; email: string; role: string }> {
  if (useMockData) return { id: 'dev', email: 'dev@example.com', role: 'owner' }; // 開発モックはUI確認のため素通し
  const sb = createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: admin } = await sb.from('admins').select('email,role').eq('id', user.id).maybeSingle();
  if (!admin) redirect('/admin/login?error=not_admin');
  return { id: user.id, email: admin.email, role: admin.role };
}

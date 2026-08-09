import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/config';

/** RLS が効く（ログインユーザー権限の）サーバークライアント。管理画面用。 */
export function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    // 管理画面も常に最新のDB状態を表示する（Next.js のデータキャッシュを無効化）。
    global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: 'no-store' }) },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* Server Component からの set は無視（middleware で更新） */
        }
      },
    },
  });
}

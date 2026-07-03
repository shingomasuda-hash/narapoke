import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config';

/**
 * サービスロールキーを使う管理クライアント。RLS をバイパスするため、
 * 顧客向けの作成/確認/キャンセルなどサーバー側処理でのみ使用する。
 * このキーは絶対にクライアントへ渡さない。
 */
export function createSupabaseAdmin() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error('Supabase のサービスロール設定がありません');
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

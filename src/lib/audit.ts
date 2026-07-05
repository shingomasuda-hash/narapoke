/**
 * 管理者操作の監査ログ記録。
 * 記録範囲: 個別予約の詳細表示 / ステータス変更 / 削除 / エクスポート実行のみ
 * （全ページビューは対象外）。失敗しても呼び出し元の操作は継続させる。
 */
import { headers } from 'next/headers';
import { useMockData } from '@/lib/config';
import { createSupabaseServer } from '@/lib/supabase/server';

export type AuditAction = 'view' | 'status_change' | 'delete' | 'export';

export async function logAudit(params: {
  adminId: string;
  adminEmail: string;
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  if (useMockData) {
    console.info('[audit mock]', params);
    return;
  }
  try {
    const ip = headers().get('x-forwarded-for') ?? null;
    const sb = createSupabaseServer();
    await sb.from('admin_audit_logs').insert({
      admin_id: params.adminId,
      admin_email: params.adminEmail,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      detail: params.detail ?? {},
      ip,
    });
  } catch (e) {
    console.error('[audit] 記録失敗', (e as Error).message);
  }
}

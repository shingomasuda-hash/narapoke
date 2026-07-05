-- =====================================================================
-- 管理者操作の監査ログ
--  - 記録範囲: 個別予約の詳細表示 / ステータス変更(更新) / 削除 / エクスポート実行
--    （全ページビューは対象外）
--  - 改ざん防止のため、管理者セッション(anon key + RLS)からは
--    「追加」と「自分の記録の閲覧」のみ許可し、更新・削除は一切許可しない。
--    （service role キーを使えば理論上バイパス可能だが、アプリコードは
--    通常のセッションクライアントからのみ書き込む）
-- =====================================================================

create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admins(id) on delete set null,
  admin_email text not null,
  action text not null,        -- 'view' / 'status_change' / 'delete' / 'export'
  target_type text not null,   -- 'reservation' 等
  target_id uuid,
  detail jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_target on admin_audit_logs(target_type, target_id);
create index if not exists idx_audit_logs_created on admin_audit_logs(created_at);

alter table admin_audit_logs enable row level security;

drop policy if exists audit_read on admin_audit_logs;
create policy audit_read on admin_audit_logs for select using (is_admin());

drop policy if exists audit_insert on admin_audit_logs;
create policy audit_insert on admin_audit_logs for insert with check (is_admin());

-- update / delete のポリシーは意図的に作成しない（既定で拒否＝改ざん・削除不可）。

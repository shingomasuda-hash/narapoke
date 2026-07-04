-- =====================================================================
-- 受付締切を「開始60分前まで」から「開始20分前まで」に変更
-- 既存の store_settings 行（id=1）も合わせて更新する。
-- =====================================================================

alter table store_settings alter column accept_cutoff_minutes set default 20;

update store_settings set accept_cutoff_minutes = 20 where id = 1;

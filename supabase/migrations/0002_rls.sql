-- =====================================================================
-- Row Level Security ポリシー
-- 方針:
--  - 個人情報を含むテーブル(customers/reservations/takeout_orders 等)は
--    anon から一切読めない。管理者(is_admin)のみ全アクセス可。
--  - 顧客向けの作成・確認・キャンセルは Server Action がサービスロールキーで
--    実行するため RLS を安全にバイパスする（クライアントに service role は出さない）。
--  - 非個人情報(メニュー/営業時間/お知らせ等)のみ anon 読み取りを許可する。
-- =====================================================================

alter table admins                enable row level security;
alter table store_settings        enable row level security;
alter table business_hours        enable row level security;
alter table special_business_hours enable row level security;
alter table closures              enable row level security;
alter table reservation_blocks    enable row level security;
alter table customers             enable row level security;
alter table reservations          enable row level security;
alter table menu_categories       enable row level security;
alter table menu_items            enable row level security;
alter table menu_option_groups    enable row level security;
alter table menu_options          enable row level security;
alter table takeout_orders        enable row level security;
alter table takeout_order_items   enable row level security;
alter table notification_logs     enable row level security;
alter table webhook_events        enable row level security;
alter table announcements         enable row level security;

-- ---- 管理者は自レコードを参照可 ----------------------------------
drop policy if exists admins_self_read on admins;
create policy admins_self_read on admins
  for select using (id = auth.uid());

-- ---- 非個人情報: anon 読み取り可、書き込みは管理者のみ ------------
-- store_settings
drop policy if exists ss_read on store_settings;
create policy ss_read on store_settings for select using (true);
drop policy if exists ss_admin on store_settings;
create policy ss_admin on store_settings for all using (is_admin()) with check (is_admin());

-- business_hours / special_business_hours / closures / reservation_blocks
drop policy if exists bh_read on business_hours;
create policy bh_read on business_hours for select using (true);
drop policy if exists bh_admin on business_hours;
create policy bh_admin on business_hours for all using (is_admin()) with check (is_admin());

drop policy if exists sbh_read on special_business_hours;
create policy sbh_read on special_business_hours for select using (true);
drop policy if exists sbh_admin on special_business_hours;
create policy sbh_admin on special_business_hours for all using (is_admin()) with check (is_admin());

drop policy if exists cl_read on closures;
create policy cl_read on closures for select using (true);
drop policy if exists cl_admin on closures;
create policy cl_admin on closures for all using (is_admin()) with check (is_admin());

drop policy if exists rb_read on reservation_blocks;
create policy rb_read on reservation_blocks for select using (true);
drop policy if exists rb_admin on reservation_blocks;
create policy rb_admin on reservation_blocks for all using (is_admin()) with check (is_admin());

-- メニュー系: anon は「公開かつ非売り切れ」を読める / 管理者は全操作
drop policy if exists mc_read on menu_categories;
create policy mc_read on menu_categories for select using (is_published or is_admin());
drop policy if exists mc_admin on menu_categories;
create policy mc_admin on menu_categories for all using (is_admin()) with check (is_admin());

drop policy if exists mi_read on menu_items;
create policy mi_read on menu_items for select using (is_published or is_admin());
drop policy if exists mi_admin on menu_items;
create policy mi_admin on menu_items for all using (is_admin()) with check (is_admin());

drop policy if exists mog_read on menu_option_groups;
create policy mog_read on menu_option_groups for select using (true);
drop policy if exists mog_admin on menu_option_groups;
create policy mog_admin on menu_option_groups for all using (is_admin()) with check (is_admin());

drop policy if exists mo_read on menu_options;
create policy mo_read on menu_options for select using (is_published or is_admin());
drop policy if exists mo_admin on menu_options;
create policy mo_admin on menu_options for all using (is_admin()) with check (is_admin());

-- お知らせ: 公開中のみ anon 読み取り可
drop policy if exists an_read on announcements;
create policy an_read on announcements
  for select using (
    is_admin() or (
      is_published
      and (publish_from is null or publish_from <= now())
      and (publish_to is null or publish_to >= now())
    )
  );
drop policy if exists an_admin on announcements;
create policy an_admin on announcements for all using (is_admin()) with check (is_admin());

-- ---- 個人情報テーブル: 管理者のみ（anon ポリシー無し=拒否） --------
-- Server Action はサービスロールキーで動作し RLS をバイパスする。
drop policy if exists cust_admin on customers;
create policy cust_admin on customers for all using (is_admin()) with check (is_admin());

drop policy if exists res_admin on reservations;
create policy res_admin on reservations for all using (is_admin()) with check (is_admin());

drop policy if exists to_admin on takeout_orders;
create policy to_admin on takeout_orders for all using (is_admin()) with check (is_admin());

drop policy if exists toi_admin on takeout_order_items;
create policy toi_admin on takeout_order_items for all using (is_admin()) with check (is_admin());

drop policy if exists nl_admin on notification_logs;
create policy nl_admin on notification_logs for all using (is_admin()) with check (is_admin());

drop policy if exists we_admin on webhook_events;
create policy we_admin on webhook_events for all using (is_admin()) with check (is_admin());

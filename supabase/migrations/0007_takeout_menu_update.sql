-- =====================================================================
-- テイクアウトメニュー改定
--  - プラン価格改定（税込）
--  - 選択サブ「韓国海苔」の追加料金を廃止（0円化）
--  - ならポケドリンク: フルーツ/野菜を1つの選択群に統合し「合計3種選択」に変更
--    （りんご・キウイ・みかんは追加料金なし化。パイン/柿/グレープフルーツのみ加算）
--  - プラン注文向けの共有オプション群を新設: ソース選択（価格差なし・必須）、
--    追加オプション（ご飯大盛り+150 / 卵黄+150、各プランのカスタマイズ画面から選択）
-- 注: menu_options / menu_option_groups の min_select・max_select はアプリ側で
--     参照していない（実際の選択数検証は menu-rules.ts で行う）。
-- =====================================================================

-- ---- プラン価格改定 ------------------------------------------------
update menu_items set price = 1320 where code = 'plan_a';
update menu_items set price = 1430 where code = 'plan_b';
update menu_items set price = 1680 where code = 'plan_c';
update menu_items set price = 1780 where code = 'plan_d';

-- ---- 韓国海苔の追加料金を廃止 ---------------------------------------
update menu_items set price = 0 where code = 'subc_kannori';

-- ---- ならポケドリンク: フルーツ/野菜グループを統合 -------------------
-- 既存の fruits / vegetables グループを削除（menu_options は on delete cascade で連動削除）。
delete from menu_option_groups
where item_id = (select id from menu_items where code = 'poke_drink_single')
  and code in ('fruits', 'vegetables');

insert into menu_option_groups (item_id, code, name, min_select, max_select, is_required, sort_order)
select mi.id, 'fruit_veg', 'フルーツ・野菜（合計3種）', 3, 3, true, 1
from menu_items mi where mi.code = 'poke_drink_single'
on conflict do nothing;

insert into menu_options (group_id, code, name, extra_price, sort_order)
select g.id, x.code, x.name, x.extra, x.sort
from (values
  ('mango','マンゴー',0,1),('ichigo','いちご',0,2),('blueberry','ブルーベリー',0,3),
  ('banana','バナナ',0,4),('ringo','りんご',0,5),('mikan','みかん',0,6),('kiwi','キウイ',0,7),
  ('pine','パイン(特選)',80,8),('kaki','柿(特選)',80,9),('grapefruit','グレープフルーツ(特選)',150,10),
  ('spinach','ほうれん草',0,11),('celery','セロリ',0,12),('basil','バジル',0,13),('komatsuna','小松菜',0,14)
) as x(code,name,extra,sort)
cross join (select id from menu_option_groups where code = 'fruit_veg') g
on conflict do nothing;

-- ---- プラン共通: ソース選択（価格差なし・必須） -----------------------
insert into menu_option_groups (item_id, code, name, min_select, max_select, is_required, sort_order)
values (null, 'plan_sauce', 'ソース選択', 1, 1, true, 1)
on conflict do nothing;

insert into menu_options (group_id, code, name, extra_price, sort_order)
select g.id, x.code, x.name, 0, x.sort
from (values
  ('standard','スタンダード（韓国風）',1),('spicy','スパイシー（ピリ辛）',2)
) as x(code,name,sort)
cross join (select id from menu_option_groups where code = 'plan_sauce' and item_id is null) g
on conflict do nothing;

-- ---- プラン共通: 追加オプション（ご飯大盛り/卵黄） --------------------
insert into menu_option_groups (item_id, code, name, min_select, max_select, is_required, sort_order)
values (null, 'plan_addon', '追加オプション', 0, 0, false, 2)
on conflict do nothing;

insert into menu_options (group_id, code, name, extra_price, sort_order)
select g.id, x.code, x.name, x.extra, x.sort
from (values
  ('rice_large','ご飯大盛り',150,1),('egg_yolk','卵黄',150,2)
) as x(code,name,extra,sort)
cross join (select id from menu_option_groups where code = 'plan_addon' and item_id is null) g
on conflict do nothing;

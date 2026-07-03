-- =====================================================================
-- 初期データ投入 seed
-- 価格はすべて税抜(整数円)。PDF 未確定の値は README「運用開始前に確認する項目」参照。
-- 管理画面から変更可能。
-- =====================================================================

-- ---- 営業時間（0=日 .. 6=土, 木=4 は定休日） ----------------------
insert into business_hours (weekday, open_minutes, close_minutes, is_closed, label) values
  (0, 660, 960, false, 'lunch'), (0, 1080, 1440, false, 'dinner'),
  (1, 660, 960, false, 'lunch'), (1, 1080, 1440, false, 'dinner'),
  (2, 660, 960, false, 'lunch'), (2, 1080, 1440, false, 'dinner'),
  (3, 660, 960, false, 'lunch'), (3, 1080, 1440, false, 'dinner'),
  (4, 660, 960, true,  '定休日'),
  (5, 660, 960, false, 'lunch'), (5, 1080, 1440, false, 'dinner'),
  (6, 660, 960, false, 'lunch'), (6, 1080, 1440, false, 'dinner')
on conflict do nothing;

-- ---- カテゴリ -----------------------------------------------------
insert into menu_categories (code, name, sort_order) values
  ('plan',       'ポケプラン',       10),
  ('main',       'メイン',           20),
  ('sub_fixed',  '固定サブ',         30),
  ('sub_choice', '選択サブ',         40),
  ('addon',      '追加オプション',   50),
  ('poke_drink', 'ならポケドリンク', 60),
  ('drink',      '通常ドリンク',     70),
  ('sweets',     'スイーツ',         80)
on conflict (code) do nothing;

-- ---- ポケプラン（meta にメイン/サブ必須数を保持） ----------------
insert into menu_items (category_id, code, name, price, meta, sort_order)
select c.id, x.code, x.name, x.price, x.meta::jsonb, x.sort
from (values
  ('plan_a','プランA',1200,'{"mainCount":2,"subCount":3}',1),
  ('plan_b','プランB',1380,'{"mainCount":2,"subCount":4}',2),
  ('plan_c','プランC',1480,'{"mainCount":3,"subCount":3}',3),
  ('plan_d','プランD',1580,'{"mainCount":3,"subCount":4}',4)
) as x(code,name,price,meta,sort)
cross join (select id from menu_categories where code='plan') c
on conflict (code) do nothing;

-- ---- メイン（イクラ/エビは初期 +250。※要確認） ------------------
insert into menu_items (category_id, code, name, price, sort_order)
select c.id, x.code, x.name, x.price, x.sort
from (values
  ('main_salmon','サーモン',0,1),
  ('main_tako','タコ',0,2),
  ('main_maguro','マグロ',0,3),
  ('main_negitoro','ネギトロ',0,4),
  ('main_ikura','イクラ',250,5),
  ('main_ebi','エビ',250,6)
) as x(code,name,price,sort)
cross join (select id from menu_categories where code='main') c
on conflict (code) do nothing;

-- ---- 固定サブ（プランに自動付帯） --------------------------------
insert into menu_items (category_id, code, name, price, sort_order)
select c.id, x.code, x.name, 0, x.sort
from (values
  ('subf_onion','赤たまねぎ',1),('subf_carrot','人参',2),('subf_cucumber','きゅうり',3)
) as x(code,name,sort)
cross join (select id from menu_categories where code='sub_fixed') c
on conflict (code) do nothing;

-- ---- 選択サブ（韓国海苔は初期 +100。※要確認） ------------------
insert into menu_items (category_id, code, name, price, sort_order)
select c.id, x.code, x.name, x.price, x.sort
from (values
  ('subc_tomato','トマト',0,1),('subc_edamame','枝豆',0,2),('subc_tuna','ツナ',0,3),
  ('subc_nuts','ナッツ',0,4),('subc_lettuce','サニーレタス',0,5),('subc_friedonion','フライドオニオン',0,6),
  ('subc_creamcheese','クリームチーズ',0,7),('subc_gomawakame','ごまわかめ',0,8),('subc_paprika','パプリカ',0,9),
  ('subc_corn','コーン',0,10),('subc_tobikko','とびっこ',0,11),('subc_avocado','アボカド',0,12),
  ('subc_takuan','たくあん',0,13),('subc_kannori','韓国海苔',100,14)
) as x(code,name,price,sort)
cross join (select id from menu_categories where code='sub_choice') c
on conflict (code) do nothing;

-- ---- 追加オプション ----------------------------------------------
insert into menu_items (category_id, code, name, price, sort_order)
select c.id, x.code, x.name, x.price, x.sort
from (values
  ('addon_ikura_ebi','イクラ・エビ トッピング追加',300,1),
  ('addon_egg','卵（温玉・卵黄）',150,2),
  ('addon_main','追加メイン',200,3),
  ('addon_sub','追加サブ',100,4),
  ('addon_rice_large','ご飯大盛り',150,5)
) as x(code,name,price,sort)
cross join (select id from menu_categories where code='addon') c
on conflict (code) do nothing;

-- ---- ならポケドリンク（単品850 / セット割-100） -----------------
insert into menu_items (category_id, code, name, price, meta, sort_order)
select c.id, 'poke_drink_single','ならポケドリンク',850,
  '{"setDiscount":-100,"fruitMin":2,"fruitMax":3,"baseTotal":4}'::jsonb,1
from (select id from menu_categories where code='poke_drink') c
on conflict (code) do nothing;

-- ---- 通常ドリンク（ポケとのセットで-100可） ---------------------
insert into menu_items (category_id, code, name, price, meta, sort_order)
select c.id, x.code, x.name, x.price, '{"setDiscount":-100}'::jsonb, x.sort
from (values
  ('drink_coffee','コーヒー Hot/Ice',600,1),
  ('drink_americano','アメリカーノ',680,2),
  ('drink_latte','ラテ Hot/Ice',680,3),
  ('drink_matcha_latte','抹茶ラテ',680,4),
  ('drink_cocoa','ココア',680,5),
  ('drink_icetea_soda','アイスティーソーダ',600,6),
  ('drink_cola','コーラ',550,7),
  ('drink_ginger','ジンジャエール',550,8),
  ('drink_orange','オレンジ',550,9),
  ('drink_apple','りんごジュース',550,10)
) as x(code,name,price,sort)
cross join (select id from menu_categories where code='drink') c
on conflict (code) do nothing;

-- ---- スイーツ（分類・価格は要確認） -----------------------------
insert into menu_items (category_id, code, name, price, sort_order)
select c.id, x.code, x.name, x.price, x.sort
from (values
  ('sweets_acai','アサイー',980,1),
  ('sweets_marshmallow','マシュマロドリンク',980,2),
  ('sweets_honey','はちみつ追加',50,3)
) as x(code,name,price,sort)
cross join (select id from menu_categories where code='sweets') c
on conflict (code) do nothing;

-- =====================================================================
-- ならポケドリンクの選択オプショングループ（フルーツ/野菜/トッピング）
-- extra_price は「3種類目に選んだ場合の追加」等、サーバー側 menu-rules.ts でも検証。
-- =====================================================================
insert into menu_option_groups (item_id, code, name, min_select, max_select, is_required, sort_order)
select mi.id, 'fruits', 'フルーツ（2〜3種）', 2, 3, true, 1
from menu_items mi where mi.code = 'poke_drink_single'
on conflict do nothing;

insert into menu_option_groups (item_id, code, name, min_select, max_select, is_required, sort_order)
select mi.id, 'vegetables', '野菜', 1, 2, true, 2
from menu_items mi where mi.code = 'poke_drink_single'
on conflict do nothing;

insert into menu_option_groups (item_id, code, name, min_select, max_select, is_required, sort_order)
select mi.id, 'toppings', '追加トッピング', 0, 0, false, 3
from menu_items mi where mi.code = 'poke_drink_single'
on conflict do nothing;

-- フルーツ（3種類目の追加料金は THIRD_FRUIT_SURCHARGE と一致させる）
insert into menu_options (group_id, code, name, extra_price, sort_order)
select g.id, x.code, x.name, x.extra, x.sort
from (values
  ('mango','マンゴー',0,1),('ichigo','いちご',0,2),('blueberry','ブルーベリー',0,3),
  ('banana','バナナ',0,4),('ringo','りんご',80,5),('mikan','みかん',100,6),('kiwi','キウイ',100,7),
  ('pine','パイン(特選)',80,8),('kaki','柿(特選)',80,9),('grapefruit','グレープフルーツ(特選)',150,10)
) as x(code,name,extra,sort)
cross join (select id from menu_option_groups where code='fruits') g
on conflict do nothing;

-- 野菜
insert into menu_options (group_id, code, name, extra_price, sort_order)
select g.id, x.code, x.name, 0, x.sort
from (values
  ('spinach','ほうれん草',1),('celery','セロリ',2),('basil','バジル',3),('komatsuna','小松菜',4)
) as x(code,name,sort)
cross join (select id from menu_option_groups where code='vegetables') g
on conflict do nothing;

-- 追加トッピング
insert into menu_options (group_id, code, name, extra_price, sort_order)
select g.id, x.code, x.name, 100, x.sort
from (values
  ('yogurt','ヨーグルト',1),('honey','はちみつ',2),('natadecoco','ナタデココ',3),('tapioca','タピオカ',4)
) as x(code,name,sort)
cross join (select id from menu_option_groups where code='toppings') g
on conflict do nothing;

-- ---- お知らせ（初期サンプル） ------------------------------------
insert into announcements (title, body, is_published) values
  ('ご予約はこちらから', 'なら和ポケ日和のオンライン予約をご利用いただけます。', true)
on conflict do nothing;

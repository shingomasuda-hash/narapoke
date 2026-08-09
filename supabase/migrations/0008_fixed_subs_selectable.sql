-- =====================================================================
-- 固定サブの選択化
--  - 従来プランに自動付帯としていた固定サブ（赤たまねぎ・人参・きゅうり）を
--    「選択サブ」カテゴリへ移し、お客様がサブとして選択できるようにする。
--  - 空になった「固定サブ」カテゴリは非公開にする（既存データ参照のため削除はしない）。
-- =====================================================================

update menu_items
set category_id = (select id from menu_categories where code = 'sub_choice'),
    sort_order = case code
      when 'subf_onion' then 15
      when 'subf_carrot' then 16
      when 'subf_cucumber' then 17
    end
where code in ('subf_onion', 'subf_carrot', 'subf_cucumber');

update menu_categories set is_published = false where code = 'sub_fixed';

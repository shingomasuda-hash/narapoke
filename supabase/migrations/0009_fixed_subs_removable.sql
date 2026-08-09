-- =====================================================================
-- 固定サブの扱いを「基本付帯 + 不要なものだけ外す」方式に変更
--  - 0008 で選択サブへ移した固定サブ（赤たまねぎ・人参・きゅうり）を
--    固定サブカテゴリへ戻す。プランには基本で入っており、注文画面では
--    別欄に表示して「不要なものだけチェックして外す」UIにする。
--  - エビは当面提供しないため非公開化（再開時は管理画面から公開に戻す）。
-- =====================================================================

update menu_items
set category_id = (select id from menu_categories where code = 'sub_fixed'),
    sort_order = case code
      when 'subf_onion' then 1
      when 'subf_carrot' then 2
      when 'subf_cucumber' then 3
    end
where code in ('subf_onion', 'subf_carrot', 'subf_cucumber');

-- 0008 で非公開にした固定サブカテゴリを戻す
update menu_categories set is_published = true where code = 'sub_fixed';

-- エビを非公開化
update menu_items set is_published = false where code = 'main_ebi';

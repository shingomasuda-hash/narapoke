-- =====================================================================
-- モーニング営業（席予約）の追加
--  - 8:00〜11:00（480〜660分）のモーニング枠を木曜以外の曜日に追加する。
--  - 予約可否の実判定はアプリ側の営業時間定義（src/lib/time.ts）で行っており、
--    business_hours は管理画面の表示用。表示と実態を揃えるために追加する。
--  - モーニングは席予約のみ（テイクアウト受取は従来どおり11:00〜）。
-- =====================================================================

insert into business_hours (weekday, open_minutes, close_minutes, is_closed, label)
select w.weekday, 480, 660, false, 'morning'
from (values (0),(1),(2),(3),(5),(6)) as w(weekday)
where not exists (
  select 1 from business_hours b where b.weekday = w.weekday and b.label = 'morning'
);

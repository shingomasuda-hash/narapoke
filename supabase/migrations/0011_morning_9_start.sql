-- =====================================================================
-- モーニング営業の開始時刻を 9:00 に確定（9:00〜11:00・木曜以外）
--  - 0010 を適用済みの環境では open_minutes を 480→540 に更新。
--  - 未適用の環境では 540〜660 の行を新規挿入する（冪等）。
--  - business_hours は管理画面の表示用。予約可否の実判定は src/lib/time.ts。
-- =====================================================================

update business_hours set open_minutes = 540 where label = 'morning';

insert into business_hours (weekday, open_minutes, close_minutes, is_closed, label)
select w.weekday, 540, 660, false, 'morning'
from (values (0),(1),(2),(3),(5),(6)) as w(weekday)
where not exists (
  select 1 from business_hours b where b.weekday = w.weekday and b.label = 'morning'
);

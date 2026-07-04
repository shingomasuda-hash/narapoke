-- =====================================================================
-- 人数区分（大人/子供/ペット）対応
--  - party_size は引き続き「座席の占有数」= 大人+子供 として使う（既存の
--    空席判定ロジックはそのまま流用できる）。
--  - ペット数は座席の占有数には含めない（記録・表示・通知用途のみ）。
--  - child_count は既存カラムを流用。adult_count / pet_count を新設し、
--    既存データは adult_count = party_size - child_count で補完する。
-- =====================================================================

alter table reservations add column if not exists adult_count int not null default 0;
alter table reservations add column if not exists pet_count int not null default 0;

update reservations
set adult_count = greatest(party_size - child_count, 0)
where adult_count = 0;

-- ---- create_reservation RPC を人数区分対応に更新 -------------------
-- 既存シグネチャは引数構成が変わるため、明示的に旧関数を削除してから再作成する
-- （CREATE OR REPLACE は引数リストが異なると別関数として追加されてしまうため）。
drop function if exists create_reservation(
  date, timestamptz, timestamptz, int, text, text, text, text, text, int, boolean, text, text, text, text
);

create or replace function create_reservation(
  p_service_date        date,
  p_start_at            timestamptz,
  p_end_at              timestamptz,
  p_party_size          int,
  p_adult_count         int,
  p_pet_count           int,
  p_customer_name       text,
  p_phone               text,
  p_email               text,
  p_line_user_id        text,
  p_note                text,
  p_child_count         int,
  p_has_stroller        boolean,
  p_allergy             text,
  p_reservation_code    text,
  p_cancel_token_hash   text,
  p_idempotency_key     text
) returns reservations
language plpgsql security definer set search_path = public as $$
declare
  v_existing   reservations;
  v_capacity   int;
  v_override   int;
  v_peak       int;
  v_row        reservations;
begin
  -- 二重送信の吸収
  if p_idempotency_key is not null then
    select * into v_existing from reservations where idempotency_key = p_idempotency_key;
    if found then return v_existing; end if;
  end if;

  -- 同一営業日を直列化（同時アクセスによる枠超過を防ぐ）
  perform pg_advisory_xact_lock(hashtext('res:' || p_service_date::text));

  -- 臨時休業（全日 or 時間帯）
  if exists (
    select 1 from closures c
    where c.service_date = p_service_date
      and (c.all_day
           or (c.start_minutes is not null
               and p_start_at < (p_service_date::timestamp at time zone 'Asia/Tokyo') + make_interval(mins => c.end_minutes)
               and p_end_at   > (p_service_date::timestamp at time zone 'Asia/Tokyo') + make_interval(mins => c.start_minutes)))
  ) then
    raise exception 'CLOSED';
  end if;

  -- 予約ブロック（貸切 / 停止）と重なるか
  if exists (
    select 1 from reservation_blocks b
    where b.service_date = p_service_date
      and b.block_type = 'private'
      and b.start_at < p_end_at and b.end_at > p_start_at
  ) then
    raise exception 'PRIVATE';
  end if;

  if exists (
    select 1 from reservation_blocks b
    where b.service_date = p_service_date
      and b.block_type = 'stop'
      and b.start_at < p_end_at and b.end_at > p_start_at
  ) then
    raise exception 'BLOCKED';
  end if;

  -- 座席上限（既定 → 当該時間帯の capacity_override があれば最小値を採用）
  select seat_capacity into v_capacity from store_settings where id = 1;
  select min(b.capacity_override) into v_override
  from reservation_blocks b
  where b.service_date = p_service_date
    and b.capacity_override is not null
    and b.start_at < p_end_at and b.end_at > p_start_at;
  if v_override is not null then v_capacity := v_override; end if;

  -- 重なる予約の合計人数のピーク（掃引点で評価） + 候補人数
  select coalesce(max(active_sum), p_party_size) into v_peak
  from (
    select tp.t,
      p_party_size + coalesce(sum(r.party_size)
        filter (where r.start_at <= tp.t and r.end_at > tp.t), 0) as active_sum
    from (
      select p_start_at as t
      union
      select r2.start_at from reservations r2
      where r2.service_date = p_service_date
        and r2.status in ('confirmed','completed')
        and r2.start_at >= p_start_at and r2.start_at < p_end_at
    ) tp
    left join reservations r
      on r.service_date = p_service_date
     and r.status in ('confirmed','completed')
     and r.start_at <= tp.t and r.end_at > tp.t
    group by tp.t
  ) s;

  if v_peak > v_capacity then
    raise exception 'FULL';
  end if;

  insert into reservations (
    reservation_code, service_date, start_at, end_at, party_size,
    adult_count, pet_count, child_count, has_stroller, allergy, customer_name, phone, email,
    line_user_id, status, note, cancel_token_hash, idempotency_key
  ) values (
    p_reservation_code, p_service_date, p_start_at, p_end_at, p_party_size,
    coalesce(p_adult_count, p_party_size), coalesce(p_pet_count,0),
    coalesce(p_child_count,0), coalesce(p_has_stroller,false), p_allergy,
    p_customer_name, p_phone, p_email, p_line_user_id, 'confirmed',
    p_note, p_cancel_token_hash, p_idempotency_key
  ) returning * into v_row;

  return v_row;
end $$;

-- =====================================================================
-- 原子的な予約作成 RPC（二重予約防止の要）
--  - 同一営業日リクエストを advisory lock で直列化
--  - 臨時休業 / 予約停止 / 貸切 / 座席上限を再チェック
--  - 重複する予約の"合計人数"のピークで空席判定（掃引点=候補開始 + 各既存開始）
--  - idempotency_key による二重送信の吸収
-- 例外(message)でアプリに理由を返す: CLOSED / PRIVATE / BLOCKED / FULL
-- =====================================================================

create or replace function create_reservation(
  p_service_date        date,
  p_start_at            timestamptz,
  p_end_at              timestamptz,
  p_party_size          int,
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
    child_count, has_stroller, allergy, customer_name, phone, email,
    line_user_id, status, note, cancel_token_hash, idempotency_key
  ) values (
    p_reservation_code, p_service_date, p_start_at, p_end_at, p_party_size,
    coalesce(p_child_count,0), coalesce(p_has_stroller,false), p_allergy,
    p_customer_name, p_phone, p_email, p_line_user_id, 'confirmed',
    p_note, p_cancel_token_hash, p_idempotency_key
  ) returning * into v_row;

  return v_row;
end $$;

-- =====================================================================
-- テイクアウト受取枠の空き（1枠あたり件数上限）を原子的に確認して注文作成
--  例外: CLOSED / FULL
-- =====================================================================
create or replace function create_takeout_order(
  p_pickup_at         timestamptz,
  p_service_date      date,
  p_customer_name     text,
  p_phone             text,
  p_email             text,
  p_line_user_id      text,
  p_note              text,
  p_allergy           text,
  p_subtotal          int,
  p_tax               int,
  p_total             int,
  p_tax_rate_percent  int,
  p_order_code        text,
  p_cancel_token_hash text,
  p_idempotency_key   text,
  p_items             jsonb
) returns takeout_orders
language plpgsql security definer set search_path = public as $$
declare
  v_existing takeout_orders;
  v_cap      int;
  v_count    int;
  v_row      takeout_orders;
  v_item     jsonb;
begin
  if p_idempotency_key is not null then
    select * into v_existing from takeout_orders where idempotency_key = p_idempotency_key;
    if found then return v_existing; end if;
  end if;

  perform pg_advisory_xact_lock(hashtext('takeout:' || p_pickup_at::text));

  -- 臨時休業（全日）
  if exists (select 1 from closures c where c.service_date = p_service_date and c.all_day) then
    raise exception 'CLOSED';
  end if;

  select takeout_slot_capacity into v_cap from store_settings where id = 1;
  select count(*) into v_count from takeout_orders
    where pickup_at = p_pickup_at and status <> 'cancelled';
  if v_count >= v_cap then
    raise exception 'FULL';
  end if;

  insert into takeout_orders (
    order_code, pickup_at, service_date, customer_name, phone, email,
    line_user_id, status, subtotal, tax, total, tax_rate_percent,
    payment_method, note, allergy, cancel_token_hash, idempotency_key
  ) values (
    p_order_code, p_pickup_at, p_service_date, p_customer_name, p_phone, p_email,
    p_line_user_id, 'received', p_subtotal, p_tax, p_total, p_tax_rate_percent,
    'store', p_note, p_allergy, p_cancel_token_hash, p_idempotency_key
  ) returning * into v_row;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into takeout_order_items (
      order_id, menu_item_id, item_code, item_name, unit_price,
      options_delta, quantity, line_subtotal, selections
    ) values (
      v_row.id,
      nullif(v_item->>'menu_item_id','')::uuid,
      v_item->>'item_code',
      v_item->>'item_name',
      (v_item->>'unit_price')::int,
      coalesce((v_item->>'options_delta')::int, 0),
      (v_item->>'quantity')::int,
      (v_item->>'line_subtotal')::int,
      coalesce(v_item->'selections', '{}'::jsonb)
    );
  end loop;

  return v_row;
end $$;

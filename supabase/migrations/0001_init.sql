-- =====================================================================
-- なら和ポケ日和 予約/テイクアウトシステム  初期スキーマ
-- タイムゾーン: Asia/Tokyo（アプリ側で JST を扱い、DB は timestamptz(UTC) 保持）
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---- 列挙型 -------------------------------------------------------
do $$ begin
  create type reservation_status as enum ('confirmed','cancelled','completed','no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type takeout_status as enum ('received','cooking','ready','picked_up','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type block_type as enum ('stop','private'); -- stop=時間帯予約停止, private=貸切
exception when duplicate_object then null; end $$;

-- ---- 管理者 -------------------------------------------------------
-- 管理者判定はメール文字列ではなく、この admins テーブルのロールで行う。
create table if not exists admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role in ('owner','staff')),
  created_at timestamptz not null default now()
);

-- 現在のユーザーが管理者かどうか（RLS で使用）
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from admins where id = auth.uid());
$$;

-- ---- 店舗設定（単一行） ------------------------------------------
create table if not exists store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'なら和ポケ日和',
  timezone text not null default 'Asia/Tokyo',
  seat_capacity int not null default 20,
  slot_minutes int not null default 30,
  max_party_size int not null default 8,
  reservation_max_days int not null default 60,
  accept_cutoff_minutes int not null default 60,      -- 予約開始 N 分前まで受付
  lunch_stay_minutes int not null default 90,
  dinner_stay_minutes int not null default 120,
  takeout_slot_minutes int not null default 30,
  takeout_cutoff_minutes int not null default 30,      -- 受取 N 分前まで注文可
  takeout_slot_capacity int not null default 4,        -- 1枠あたり最大件数
  takeout_tax_rate_percent int not null default 10,    -- 税率(%)。コードに固定しない
  cancel_deadline_minutes int not null default 120,    -- 席予約のキャンセル可能期限（開始 N 分前）
  reminder_prev_day_hour int not null default 18,      -- 前日リマインド時刻(JST)
  reminder_before_hours int not null default 2,        -- 開始 N 時間前リマインド
  reminder_enabled boolean not null default true,
  instagram_url text not null default 'https://www.instagram.com/nara.poke1101/',
  updated_at timestamptz not null default now()
);
insert into store_settings (id) values (1) on conflict (id) do nothing;

-- ---- 通常営業時間（曜日別） --------------------------------------
-- close_minutes は 1440(=24:00) を許容する。
create table if not exists business_hours (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6), -- 0=日 .. 6=土
  open_minutes int not null check (open_minutes between 0 and 1440),
  close_minutes int not null check (close_minutes between 0 and 1440),
  is_closed boolean not null default false, -- 定休日(木=4)
  label text
);

-- ---- 特別営業時間（特定日の営業時間変更） ------------------------
create table if not exists special_business_hours (
  id uuid primary key default gen_random_uuid(),
  service_date date not null,
  open_minutes int not null check (open_minutes between 0 and 1440),
  close_minutes int not null check (close_minutes between 0 and 1440),
  label text
);
create index if not exists idx_special_hours_date on special_business_hours(service_date);

-- ---- 臨時休業 -----------------------------------------------------
create table if not exists closures (
  id uuid primary key default gen_random_uuid(),
  service_date date not null,
  all_day boolean not null default true,
  start_minutes int,   -- 部分休業の場合
  end_minutes int,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_closures_date on closures(service_date);

-- ---- 予約ブロック（時間帯停止 / 貸切 / 座席上限変更） --------------
create table if not exists reservation_blocks (
  id uuid primary key default gen_random_uuid(),
  service_date date not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  block_type block_type not null default 'stop',
  capacity_override int,  -- 特定日/時間帯の座席上限（null=既定）
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_blocks_date on reservation_blocks(service_date);

-- ---- 顧客 ---------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique,
  name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);
create index if not exists idx_customers_phone on customers(phone);

-- ---- 席予約 -------------------------------------------------------
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null unique,
  customer_id uuid references customers(id) on delete set null,
  service_date date not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  party_size int not null check (party_size > 0),
  child_count int not null default 0,
  has_stroller boolean not null default false,
  allergy text,
  customer_name text not null,
  phone text not null,
  email text,
  line_user_id text,
  status reservation_status not null default 'confirmed',
  note text,
  cancel_token_hash text not null,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_res_date_status on reservations(service_date, status);
create index if not exists idx_res_start on reservations(start_at);
create index if not exists idx_res_line on reservations(line_user_id);

-- ---- メニュー -----------------------------------------------------
create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,        -- plan / main / sub_fixed / sub_choice / poke_drink / drink / sweets ...
  name text not null,
  sort_order int not null default 0,
  is_published boolean not null default true
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references menu_categories(id) on delete cascade,
  code text not null unique,
  name text not null,
  price int not null default 0,     -- 税込単価（整数円）
  is_published boolean not null default true,
  is_sold_out boolean not null default false,
  sort_order int not null default 0,
  meta jsonb not null default '{}'::jsonb, -- プラン: {mainCount, subCount} 等
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_items_category on menu_items(category_id);

-- ---- オプション（メイン数/サブ数/トッピング/セット割 等） ----------
create table if not exists menu_option_groups (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references menu_items(id) on delete cascade, -- null=汎用グループ
  code text not null,
  name text not null,
  min_select int not null default 0,
  max_select int not null default 0,   -- 0=無制限
  is_required boolean not null default false,
  sort_order int not null default 0
);

create table if not exists menu_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references menu_option_groups(id) on delete cascade,
  code text not null,
  name text not null,
  extra_price int not null default 0,  -- 追加料金（税込, 負値=割引）
  is_published boolean not null default true,
  is_sold_out boolean not null default false,
  sort_order int not null default 0
);

-- ---- テイクアウト注文 --------------------------------------------
create table if not exists takeout_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_id uuid references customers(id) on delete set null,
  pickup_at timestamptz not null,
  service_date date not null,
  customer_name text not null,
  phone text not null,
  email text,
  line_user_id text,
  status takeout_status not null default 'received',
  subtotal int not null default 0,     -- 税抜
  tax int not null default 0,
  total int not null default 0,        -- 税込
  tax_rate_percent int not null default 10,
  payment_method text not null default 'store',  -- 店舗支払い（将来 Stripe 等を追加しやすい形）
  note text,
  allergy text,
  cancel_token_hash text not null,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_takeout_date_status on takeout_orders(service_date, status);
create index if not exists idx_takeout_pickup on takeout_orders(pickup_at);
create index if not exists idx_takeout_line on takeout_orders(line_user_id);

-- ---- 注文明細（注文時点のスナップショットを保存） -----------------
create table if not exists takeout_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references takeout_orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  item_code text not null,       -- 注文時点のコード
  item_name text not null,       -- 注文時点の名称
  unit_price int not null,       -- 注文時点の税込単価
  options_delta int not null default 0, -- 追加料金合計（税込）
  quantity int not null check (quantity > 0),
  line_subtotal int not null,    -- (unit_price + options_delta) * quantity
  selections jsonb not null default '{}'::jsonb, -- 選択内容のスナップショット
  created_at timestamptz not null default now()
);
create index if not exists idx_order_items_order on takeout_order_items(order_id);

-- ---- 通知ログ（重複送信防止・送信結果記録） ----------------------
create table if not exists notification_logs (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,      -- reservation / takeout
  target_id uuid not null,
  channel text not null,          -- line / mock
  kind text not null,             -- created / changed / cancelled / reminder_prev_day / reminder_before ...
  recipient text,                 -- line_user_id or staff id
  status text not null default 'sent', -- sent / failed
  error text,
  created_at timestamptz not null default now()
);
-- 同じ通知の二重送信を防ぐ一意制約
create unique index if not exists uq_notification_once
  on notification_logs(target_type, target_id, kind, recipient)
  where status = 'sent';

-- ---- Webhook イベント（再送による重複処理防止） -----------------
create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,  -- LINE の webhook event id 等
  payload jsonb,
  processed_at timestamptz not null default now()
);

-- ---- お知らせ -----------------------------------------------------
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  is_published boolean not null default true,
  publish_from timestamptz,
  publish_to timestamptz,
  created_at timestamptz not null default now()
);

-- ---- updated_at 自動更新 -----------------------------------------
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_res_touch on reservations;
create trigger trg_res_touch before update on reservations
  for each row execute function touch_updated_at();
drop trigger if exists trg_takeout_touch on takeout_orders;
create trigger trg_takeout_touch before update on takeout_orders
  for each row execute function touch_updated_at();
drop trigger if exists trg_items_touch on menu_items;
create trigger trg_items_touch before update on menu_items
  for each row execute function touch_updated_at();

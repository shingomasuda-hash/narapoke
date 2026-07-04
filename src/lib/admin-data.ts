/** 管理画面用データ取得（開発モックは固定サンプル）。 */
import { useMockData } from '@/lib/config';
import { createSupabaseServer } from '@/lib/supabase/server';

export function todayJst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

export async function loadDashboard(date: string = todayJst()) {
  if (useMockData) {
    return { date, reservationCount: 3, orderCount: 2, guests: 8, revenue: 5230 };
  }
  const sb = createSupabaseServer();
  const [{ data: res }, { data: ord }] = await Promise.all([
    sb.from('reservations').select('party_size,status').eq('service_date', date).eq('status', 'confirmed'),
    sb.from('takeout_orders').select('total,status').eq('service_date', date).neq('status', 'cancelled'),
  ]);
  const guests = (res ?? []).reduce((a, r) => a + r.party_size, 0);
  const revenue = (ord ?? []).reduce((a, o) => a + o.total, 0);
  return { date, reservationCount: res?.length ?? 0, orderCount: ord?.length ?? 0, guests, revenue };
}

export interface ReservationRow {
  id: string;
  reservation_code: string;
  start_at: string;
  party_size: number;
  adult_count: number;
  child_count: number;
  pet_count: number;
  customer_name: string;
  phone: string;
  email?: string | null;
  status: string;
  note?: string | null;
  allergy?: string | null;
}

export async function loadReservationsForDate(date: string = todayJst()): Promise<ReservationRow[]> {
  if (useMockData) {
    return [
      { id: '1', reservation_code: 'R-AAAA-1111', start_at: `${date}T02:00:00Z`, party_size: 2, adult_count: 2, child_count: 0, pet_count: 0, customer_name: '山田太郎', phone: '09011112222', email: 'yamada@example.com', status: 'confirmed', note: '', allergy: '' },
      { id: '2', reservation_code: 'R-BBBB-2222', start_at: `${date}T04:30:00Z`, party_size: 4, adult_count: 3, child_count: 1, pet_count: 0, customer_name: '佐藤花子', phone: '08033334444', email: 'sato@example.com', status: 'confirmed', note: '窓際希望', allergy: 'えび' },
    ];
  }
  const sb = createSupabaseServer();
  const { data } = await sb.from('reservations').select('*').eq('service_date', date).order('start_at');
  return (data ?? []) as ReservationRow[];
}

export async function loadTodayOrders() {
  const date = todayJst();
  if (useMockData) {
    return [
      { id: 'o1', order_code: 'T-CCCC-3333', pickup_at: `${date}T05:00:00Z`, total: 2695, status: 'received', customer_name: '鈴木一郎', phone: '09055556666' },
    ];
  }
  const sb = createSupabaseServer();
  const { data } = await sb.from('takeout_orders').select('*').eq('service_date', date).order('pickup_at');
  return data ?? [];
}

export interface MenuAdminItem {
  id: string;
  code: string;
  name: string;
  price: number;
  is_published: boolean;
  is_sold_out: boolean;
  category: string;
}

export async function loadMenuAdmin(): Promise<MenuAdminItem[]> {
  if (useMockData) {
    return [
      { id: 'm1', code: 'plan_a', name: 'プランA', price: 1200, is_published: true, is_sold_out: false, category: 'ポケプラン' },
      { id: 'm2', code: 'main_ikura', name: 'イクラ', price: 250, is_published: true, is_sold_out: false, category: 'メイン' },
    ];
  }
  const sb = createSupabaseServer();
  const { data } = await sb
    .from('menu_items')
    .select('id,code,name,price,is_published,is_sold_out,sort_order,menu_categories(name,sort_order)')
    .order('sort_order', { foreignTable: 'menu_categories' })
    .order('sort_order');
  // @ts-expect-error join
  return (data ?? []).map((i) => ({ ...i, category: i.menu_categories?.name ?? '' }));
}

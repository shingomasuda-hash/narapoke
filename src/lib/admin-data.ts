/** 管理画面用データ取得（開発モックは固定サンプル）。 */
import { useMockData } from '@/lib/config';
import { createSupabaseServer } from '@/lib/supabase/server';

function todayJst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

export async function loadDashboard() {
  const date = todayJst();
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

export async function loadTodayReservations() {
  const date = todayJst();
  if (useMockData) {
    return [
      { id: '1', reservation_code: 'R-AAAA-1111', start_at: `${date}T02:00:00Z`, party_size: 2, customer_name: '山田太郎', phone: '09011112222', status: 'confirmed', note: '', allergy: '' },
      { id: '2', reservation_code: 'R-BBBB-2222', start_at: `${date}T04:30:00Z`, party_size: 4, customer_name: '佐藤花子', phone: '08033334444', status: 'confirmed', note: '窓際希望', allergy: 'えび' },
    ];
  }
  const sb = createSupabaseServer();
  const { data } = await sb.from('reservations').select('*').eq('service_date', date).order('start_at');
  return data ?? [];
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

export async function loadMenuAdmin() {
  if (useMockData) {
    return [
      { id: 'm1', code: 'plan_a', name: 'プランA', price: 1200, is_published: true, is_sold_out: false, category: 'ポケプラン' },
      { id: 'm2', code: 'main_ikura', name: 'イクラ', price: 250, is_published: true, is_sold_out: false, category: 'メイン' },
    ];
  }
  const sb = createSupabaseServer();
  const { data } = await sb.from('menu_items').select('id,code,name,price,is_published,is_sold_out,menu_categories(name)').order('sort_order');
  // @ts-expect-error join
  return (data ?? []).map((i) => ({ ...i, category: i.menu_categories?.name ?? '' }));
}

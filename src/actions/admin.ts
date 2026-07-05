'use server';
/** 管理者操作。requireAdmin で保護し、RLS(is_admin) 下のサーバークライアントで実行。 */
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { createSupabaseServer } from '@/lib/supabase/server';
import { useMockData } from '@/lib/config';
import { notify } from '@/lib/line/client';
import { logAudit } from '@/lib/audit';

/** 予約詳細の表示を監査ログに記録する（一覧表示自体は対象外）。 */
export async function logReservationView(id: string) {
  const admin = await requireAdmin();
  await logAudit({ adminId: admin.id, adminEmail: admin.email, action: 'view', targetType: 'reservation', targetId: id });
  return { ok: true };
}

export async function setReservationStatus(
  id: string,
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show',
  previousStatus?: string,
) {
  const admin = await requireAdmin();
  if (useMockData) return { ok: true };
  const sb = createSupabaseServer();
  const { error } = await sb.from('reservations').update({ status }).eq('id', id);
  if (!error) {
    await logAudit({
      adminId: admin.id, adminEmail: admin.email, action: 'status_change', targetType: 'reservation', targetId: id,
      detail: { from: previousStatus ?? null, to: status },
    });
  }
  revalidatePath('/admin/reservations');
  revalidatePath('/admin');
  return { ok: !error };
}

export async function setOrderStatus(id: string, status: 'received' | 'cooking' | 'ready' | 'picked_up' | 'cancelled') {
  await requireAdmin();
  if (useMockData) return { ok: true };
  const sb = createSupabaseServer();
  const { error } = await sb.from('takeout_orders').update({ status }).eq('id', id);
  revalidatePath('/admin/orders');
  return { ok: !error };
}

export async function toggleSoldOut(id: string, soldOut: boolean) {
  await requireAdmin();
  if (useMockData) return { ok: true };
  const sb = createSupabaseServer();
  const { error } = await sb.from('menu_items').update({ is_sold_out: soldOut }).eq('id', id);
  revalidatePath('/admin/menu');
  return { ok: !error };
}

export async function togglePublished(id: string, published: boolean) {
  await requireAdmin();
  if (useMockData) return { ok: true };
  const sb = createSupabaseServer();
  const { error } = await sb.from('menu_items').update({ is_published: published }).eq('id', id);
  revalidatePath('/admin/menu');
  return { ok: !error };
}

export async function updateItemPrice(id: string, price: number) {
  await requireAdmin();
  if (useMockData) return { ok: true };
  if (!Number.isInteger(price) || price < 0) return { ok: false };
  const sb = createSupabaseServer();
  const { error } = await sb.from('menu_items').update({ price }).eq('id', id);
  revalidatePath('/admin/menu');
  return { ok: !error };
}

export async function addClosure(serviceDate: string, reason: string) {
  await requireAdmin();
  if (useMockData) return { ok: true };
  const sb = createSupabaseServer();
  const { error } = await sb.from('closures').insert({ service_date: serviceDate, all_day: true, reason });
  revalidatePath('/admin/closures');
  return { ok: !error };
}

export async function removeClosure(id: string) {
  await requireAdmin();
  if (useMockData) return { ok: true };
  const sb = createSupabaseServer();
  const { error } = await sb.from('closures').delete().eq('id', id);
  revalidatePath('/admin/closures');
  return { ok: !error };
}

export async function updateSettings(patch: Record<string, number | boolean | string>) {
  await requireAdmin();
  if (useMockData) return { ok: true };
  const sb = createSupabaseServer();
  const { error } = await sb.from('store_settings').update(patch).eq('id', 1);
  revalidatePath('/admin/settings');
  return { ok: !error };
}

export async function resendReservationNotice(id: string, lineUserId: string | null, text: string) {
  await requireAdmin();
  await notify({ to: lineUserId, messages: [{ type: 'text', text }], targetType: 'reservation', targetId: id, kind: 'resend' });
  return { ok: true };
}

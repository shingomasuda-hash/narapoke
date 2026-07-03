/** store_settings の読み込み（未設定=開発モックの既定値）。 */
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { useMockData, env } from '@/lib/config';

export interface StoreSettings {
  seatCapacity: number;
  slotMinutes: number;
  maxPartySize: number;
  reservationMaxDays: number;
  acceptCutoffMinutes: number;
  lunchStayMinutes: number;
  dinnerStayMinutes: number;
  takeoutSlotMinutes: number;
  takeoutCutoffMinutes: number;
  takeoutSlotCapacity: number;
  takeoutTaxRatePercent: number;
  cancelDeadlineMinutes: number;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  seatCapacity: 20,
  slotMinutes: 30,
  maxPartySize: 8,
  reservationMaxDays: env.reservationMaxDays,
  acceptCutoffMinutes: 60,
  lunchStayMinutes: 90,
  dinnerStayMinutes: 120,
  takeoutSlotMinutes: 30,
  takeoutCutoffMinutes: 30,
  takeoutSlotCapacity: 4,
  takeoutTaxRatePercent: env.takeoutTaxRate ?? 10,
  cancelDeadlineMinutes: 120,
};

export async function loadSettings(): Promise<StoreSettings> {
  if (useMockData) return DEFAULT_SETTINGS;
  try {
    const sb = createSupabaseAdmin();
    const { data } = await sb.from('store_settings').select('*').eq('id', 1).single();
    if (!data) return DEFAULT_SETTINGS;
    return {
      seatCapacity: data.seat_capacity,
      slotMinutes: data.slot_minutes,
      maxPartySize: data.max_party_size,
      reservationMaxDays: data.reservation_max_days,
      acceptCutoffMinutes: data.accept_cutoff_minutes,
      lunchStayMinutes: data.lunch_stay_minutes,
      dinnerStayMinutes: data.dinner_stay_minutes,
      takeoutSlotMinutes: data.takeout_slot_minutes,
      takeoutCutoffMinutes: data.takeout_cutoff_minutes,
      takeoutSlotCapacity: data.takeout_slot_capacity,
      takeoutTaxRatePercent: env.takeoutTaxRate ?? data.takeout_tax_rate_percent,
      cancelDeadlineMinutes: data.cancel_deadline_minutes,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** ランチ/ディナーで滞在時間を選ぶ（開始が16:00より前ならランチ扱い）。 */
export function stayMinutesFor(startMinutesFromMidnight: number, s: StoreSettings): number {
  return startMinutesFromMidnight < 16 * 60 ? s.lunchStayMinutes : s.dinnerStayMinutes;
}

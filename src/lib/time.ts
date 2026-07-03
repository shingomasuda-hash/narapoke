/**
 * 時刻・営業時間ユーティリティ（タイムゾーン: Asia/Tokyo 固定）
 *
 * 設計方針:
 * - JST は UTC+9 固定（日本にサマータイムは無い）ため、ライブラリ非依存で
 *   決定論的に計算できる純関数として実装し、単体テストしやすくする。
 * - 「24:00」は 1440 分（＝翌日 00:00）として内部的に正しく扱う。
 * - 予約枠生成・営業時間判定は「その営業日の 0:00 からの経過分(minutesFromMidnight)」で行う。
 * - 絶対時刻(start_at / end_at)は Date(UTC instant) で保持し、重複判定はこの絶対時刻で行う。
 */

export const MINUTES_IN_DAY = 1440;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 曜日: 0=日 1=月 2=火 3=水 4=木 5=金 6=土 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const THURSDAY: Weekday = 4;

/** "HH:mm" を 0:00 からの経過分に変換。"24:00" は 1440 を返す。 */
export function parseTimeToMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`不正な時刻形式です: ${hhmm}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (min < 0 || min > 59) throw new Error(`不正な分です: ${hhmm}`);
  const total = h * 60 + min;
  if (total < 0 || total > MINUTES_IN_DAY) throw new Error(`範囲外の時刻です: ${hhmm}`);
  return total;
}

/** 経過分を "HH:mm" に変換。1440 以上は 24:00 / 25:30 等として表示する。 */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 営業日(YYYY-MM-DD, JST) と 0:00 からの経過分から、絶対時刻(Date)を得る。
 * minutes は 1440 を超えてもよい（例: 23:30 開始 + 120 分滞在 = 翌 01:30）。
 */
export function jstInstant(serviceDate: string, minutesFromMidnight: number): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(serviceDate);
  if (!m) throw new Error(`不正な日付形式です: ${serviceDate}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // JST 00:00 の絶対時刻 = そのカレンダー日 00:00(UTC) から 9 時間戻したもの
  const jstMidnightMs = Date.UTC(y, mo - 1, d) - JST_OFFSET_MS;
  return new Date(jstMidnightMs + minutesFromMidnight * 60_000);
}

/** 絶対時刻を JST のカレンダー要素に分解する。 */
export function jstParts(date: Date): {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: Weekday;
  minutesFromMidnight: number;
  serviceDate: string; // YYYY-MM-DD
} {
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const weekday = shifted.getUTCDay() as Weekday;
  const minutesFromMidnight = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  const serviceDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { year, month, day, weekday, minutesFromMidnight, serviceDate };
}

/** その営業日(YYYY-MM-DD)の曜日を返す。 */
export function weekdayOf(serviceDate: string): Weekday {
  return jstParts(jstInstant(serviceDate, 0)).weekday;
}

export function isThursday(serviceDate: string): boolean {
  return weekdayOf(serviceDate) === THURSDAY;
}

/** 営業時間帯（分単位）。close は 1440(=24:00) を取りうる。 */
export interface OpenWindow {
  openMin: number;
  closeMin: number;
  label?: string;
}

/** 店舗の初期営業時間（管理画面/DB で上書き可能。ここは既定値）。 */
export const DEFAULT_WINDOWS: OpenWindow[] = [
  { openMin: parseTimeToMinutes('11:00'), closeMin: parseTimeToMinutes('16:00'), label: 'lunch' },
  { openMin: parseTimeToMinutes('18:00'), closeMin: parseTimeToMinutes('24:00'), label: 'dinner' },
];

/**
 * ある開始時刻(分)が予約可能な営業時間内かどうか。
 * 16:00〜18:00 は上の DEFAULT_WINDOWS の隙間として自然に「不可」になる。
 */
export function isWithinOpenWindows(
  startMin: number,
  windows: OpenWindow[] = DEFAULT_WINDOWS
): boolean {
  return windows.some((w) => startMin >= w.openMin && startMin < w.closeMin);
}

/**
 * 予約開始枠を生成する（30 分刻み等）。営業時間内の開始時刻のみを列挙する。
 * lastAcceptWindowMin: 「開始時刻の N 分前まで受付」の N。現在時刻より前や締切超過は除外する。
 */
export function generateStartSlots(params: {
  serviceDate: string;
  slotMinutes: number;
  windows?: OpenWindow[];
  now?: Date;
  acceptCutoffMinutes?: number; // 予約開始 N 分前まで受付
}): { minutes: number; label: string; startAt: Date }[] {
  const {
    serviceDate,
    slotMinutes,
    windows = DEFAULT_WINDOWS,
    now = new Date(),
    acceptCutoffMinutes = 60,
  } = params;

  const slots: { minutes: number; label: string; startAt: Date }[] = [];
  for (const w of windows) {
    for (let t = w.openMin; t < w.closeMin; t += slotMinutes) {
      const startAt = jstInstant(serviceDate, t);
      // 締切: 開始 N 分前を過ぎていたら除外
      const cutoff = new Date(startAt.getTime() - acceptCutoffMinutes * 60_000);
      if (cutoff.getTime() <= now.getTime()) continue;
      slots.push({ minutes: t, label: formatMinutes(t), startAt });
    }
  }
  return slots;
}

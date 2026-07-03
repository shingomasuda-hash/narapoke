/**
 * 空席判定ロジック
 *
 * 仕様の要点:
 * - 「予約件数」ではなく、時間帯が重複する予約の"合計人数"で判定する。
 * - キャンセル済み(cancelled)・無断キャンセル(no_show)は席数に含めない。
 * - 候補予約 [start,end) の中で、同時に使用される席数の最大値 + 候補人数 が
 *   その時点の座席上限を超えなければ予約可能。
 *
 * これは掃引法(sweep line)で厳密に計算する。単純な「開始時刻ごとの合計」では、
 * 滞在時間が異なる予約が交差するケースを取りこぼすため。
 */

export interface Interval {
  start: Date;
  end: Date;
  size: number; // 人数
}

export type CountableStatus = 'confirmed' | 'completed';

/** 席数に数える予約かどうか（cancelled / no_show は除外）。 */
export function isCountable(status: string): boolean {
  return status === 'confirmed' || status === 'completed';
}

/**
 * 区間集合を [windowStart, windowEnd) にクリップした上で、
 * その窓の中で「同時に重なる size の合計」の最大値を返す。
 */
export function maxConcurrent(
  intervals: Interval[],
  windowStart: Date,
  windowEnd: Date
): number {
  type Ev = { t: number; delta: number };
  const events: Ev[] = [];
  const ws = windowStart.getTime();
  const we = windowEnd.getTime();

  for (const iv of intervals) {
    const s = Math.max(iv.start.getTime(), ws);
    const e = Math.min(iv.end.getTime(), we);
    if (s >= e) continue; // 窓と重ならない
    events.push({ t: s, delta: +iv.size });
    events.push({ t: e, delta: -iv.size });
  }

  // 同時刻では「終了(-)」を「開始(+)」より先に処理する。
  // 半開区間 [start,end) なので end 時点はもう使用していない扱い。
  events.sort((a, b) => (a.t - b.t) || (a.delta - b.delta));

  let cur = 0;
  let max = 0;
  for (const ev of events) {
    cur += ev.delta;
    if (cur > max) max = cur;
  }
  return max;
}

/**
 * 候補予約が座席上限内に収まるか判定する。
 * @returns { ok, usedPeak, remaining }
 */
export function canReserve(params: {
  existing: Interval[]; // 既存の"数えるべき"予約のみ
  candidate: Interval;
  capacity: number;
}): { ok: boolean; usedPeak: number; remaining: number } {
  const { existing, candidate, capacity } = params;
  const all = [...existing, candidate];
  const peak = maxConcurrent(all, candidate.start, candidate.end);
  return {
    ok: peak <= capacity,
    usedPeak: peak,
    remaining: Math.max(0, capacity - peak),
  };
}

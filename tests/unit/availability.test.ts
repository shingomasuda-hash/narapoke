import { describe, it, expect } from 'vitest';
import { canReserve, maxConcurrent, isCountable } from '@/lib/availability';
import { jstInstant } from '@/lib/time';

const base = '2099-02-01';
const at = (min: number) => jstInstant(base, min);

describe('空席判定（合計人数の重複ピーク）', () => {
  it('12:00の4名(90分)と12:30の6名(90分)は12:30台に10席使用', () => {
    const r1 = { start: at(720), end: at(810), size: 4 };
    const r2 = { start: at(750), end: at(840), size: 6 };
    expect(maxConcurrent([r1, r2], at(720), at(900))).toBe(10);
  });

  it('座席数20なら +8名は可、座席数12なら不可', () => {
    const existing = [{ start: at(720), end: at(810), size: 4 }, { start: at(750), end: at(840), size: 6 }];
    const cand = { start: at(750), end: at(840), size: 8 };
    expect(canReserve({ existing, candidate: cand, capacity: 20 }).ok).toBe(true);
    expect(canReserve({ existing, candidate: cand, capacity: 12 }).ok).toBe(false);
  });

  it('隣接する予約(12-13, 13-14)は重ならない', () => {
    const a = { start: at(720), end: at(780), size: 20 };
    const b = { start: at(780), end: at(840), size: 20 };
    expect(maxConcurrent([a, b], at(720), at(840))).toBe(20);
  });

  it('cancelled / no_show は席数に含めない', () => {
    expect(isCountable('confirmed')).toBe(true);
    expect(isCountable('completed')).toBe(true);
    expect(isCountable('cancelled')).toBe(false);
    expect(isCountable('no_show')).toBe(false);
  });

  it('座席数ちょうどは可、超過は不可', () => {
    const existing = [{ start: at(720), end: at(810), size: 18 }];
    expect(canReserve({ existing, candidate: { start: at(720), end: at(810), size: 2 }, capacity: 20 }).ok).toBe(true);
    expect(canReserve({ existing, candidate: { start: at(720), end: at(810), size: 3 }, capacity: 20 }).ok).toBe(false);
  });
});

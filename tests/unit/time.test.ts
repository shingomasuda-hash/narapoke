import { describe, it, expect } from 'vitest';
import { parseTimeToMinutes, formatMinutes, jstInstant, jstParts, isThursday, isWithinOpenWindows, generateStartSlots } from '@/lib/time';

describe('営業時間・時刻処理', () => {
  it('24:00 は 1440 分として扱う', () => {
    expect(parseTimeToMinutes('24:00')).toBe(1440);
    expect(formatMinutes(1440)).toBe('24:00');
    expect(formatMinutes(1530)).toBe('25:30');
  });

  it('木曜日は判定できる（2025-07-03 は木曜）', () => {
    expect(isThursday('2025-07-03')).toBe(true);
    expect(isThursday('2025-07-04')).toBe(false);
  });

  it('11:00〜16:00 は予約可能、16:00〜18:00 は不可', () => {
    expect(isWithinOpenWindows(parseTimeToMinutes('11:00'))).toBe(true);
    expect(isWithinOpenWindows(parseTimeToMinutes('12:30'))).toBe(true);
    expect(isWithinOpenWindows(parseTimeToMinutes('16:00'))).toBe(false);
    expect(isWithinOpenWindows(parseTimeToMinutes('17:00'))).toBe(false);
  });

  it('18:00〜24:00 は予約可能', () => {
    expect(isWithinOpenWindows(parseTimeToMinutes('18:00'))).toBe(true);
    expect(isWithinOpenWindows(parseTimeToMinutes('23:30'))).toBe(true);
    expect(isWithinOpenWindows(1440)).toBe(false); // 24:00 は開始枠にしない
  });

  it('23:30開始+120分は翌日01:30として処理される', () => {
    const start = jstInstant('2025-07-04', parseTimeToMinutes('23:30'));
    const end = new Date(start.getTime() + 120 * 60_000);
    const p = jstParts(end);
    expect(p.serviceDate).toBe('2025-07-05');
    expect(p.minutesFromMidnight).toBe(90);
  });

  it('枠生成は 16:00〜18:00 を除外し 11:00〜23:30 を含む', () => {
    const slots = generateStartSlots({ serviceDate: '2099-01-05', slotMinutes: 30, now: new Date('2099-01-01T00:00:00Z') });
    const labels = slots.map((s) => s.label);
    expect(labels[0]).toBe('11:00');
    expect(labels).not.toContain('16:00');
    expect(labels).not.toContain('17:00');
    expect(labels).toContain('18:00');
    expect(labels[labels.length - 1]).toBe('23:30');
  });
});

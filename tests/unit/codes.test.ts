import { describe, it, expect } from 'vitest';
import { generateReservationCode, generateCancelToken, hashToken, verifyToken } from '@/lib/codes';

describe('予約番号・キャンセルトークン', () => {
  it('予約番号は読みやすい形式', () => {
    expect(generateReservationCode()).toMatch(/^R-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });
  it('トークンはハッシュで検証でき、平文は保存されない', () => {
    const tok = generateCancelToken();
    const h = hashToken(tok);
    expect(h).not.toBe(tok);
    expect(h.length).toBe(64);
    expect(verifyToken(tok, h)).toBe(true);
    expect(verifyToken(tok + 'x', h)).toBe(false);
  });
});

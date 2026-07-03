/**
 * 予約番号・キャンセルトークンの生成と検証
 *
 * - reservation_code / order_code: 人が読みやすい短い識別子。
 * - cancel token: 推測困難な乱数。DB には平文を保存せず SHA-256 ハッシュのみ保存する。
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // 紛らわしい I,L,O,U を除外

/** 人が読みやすい予約番号: 例 R-3F7K-9QP2 */
export function generateReservationCode(prefix = 'R'): string {
  const block = () =>
    Array.from({ length: 4 }, () => CROCKFORD[randomInt(CROCKFORD.length)]).join('');
  return `${prefix}-${block()}-${block()}`;
}

export function generateOrderCode(): string {
  return generateReservationCode('T'); // Takeout
}

/** URL に載せる推測困難なトークン（平文はユーザーにのみ渡す）。 */
export function generateCancelToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 定数時間比較でトークンを検証する。 */
export function verifyToken(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** 冪等キー（同一予約の二重送信防止用）。 */
export function generateIdempotencyKey(): string {
  return randomBytes(16).toString('hex');
}

/**
 * 管理者ログインの連続失敗によるアカウント一時ロック（インメモリ）。
 * IPごとのレート制限(rate-limit.ts)と組み合わせて使う。
 * 単一インスタンス前提の暫定実装。スケール時は Upstash Redis 等に置換する（rate-limit.ts と同様）。
 */
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60_000;
const FAILURE_WINDOW_MS = 15 * 60_000;

interface LoginState {
  failures: number;
  windowStartedAt: number;
  lockedUntil: number;
}

const attempts = new Map<string, LoginState>();

export function checkLoginLock(emailKey: string): { locked: boolean; retryAfterMs: number } {
  const s = attempts.get(emailKey);
  if (!s || s.lockedUntil <= Date.now()) return { locked: false, retryAfterMs: 0 };
  return { locked: true, retryAfterMs: s.lockedUntil - Date.now() };
}

export function recordLoginFailure(emailKey: string): void {
  const now = Date.now();
  const s = attempts.get(emailKey);
  if (!s || now - s.windowStartedAt > FAILURE_WINDOW_MS) {
    attempts.set(emailKey, { failures: 1, windowStartedAt: now, lockedUntil: 0 });
    return;
  }
  s.failures += 1;
  if (s.failures >= MAX_FAILURES) s.lockedUntil = now + LOCKOUT_MS;
}

export function recordLoginSuccess(emailKey: string): void {
  attempts.delete(emailKey);
}

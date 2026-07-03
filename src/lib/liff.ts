'use client';
/**
 * LIFF 初期化ヘルパー。
 * - LIFF 環境でなくても（通常ブラウザでも）予約可能にするため、失敗は握りつぶす。
 * - 表示名は初期値としてのみ使用し、userId/表示名の真正性はサーバー側で ID トークン検証する。
 * - liff SDK は本番で `import('@line/liff')` する。ここでは動的読込にして未設定でも動くようにする。
 */
import { env } from '@/lib/config';

export interface LiffProfile {
  inClient: boolean;
  displayName?: string;
  idToken?: string;
}

export async function initLiff(): Promise<LiffProfile> {
  if (!env.liffId || typeof window === 'undefined') {
    return { inClient: false };
  }
  try {
    // @ts-expect-error 動的 import（依存を任意に）
    const liffModule = await import(/* webpackIgnore: true */ '@line/liff').catch(() => null);
    if (!liffModule) return { inClient: false };
    const liff = liffModule.default;
    await liff.init({ liffId: env.liffId });
    if (!liff.isLoggedIn()) {
      // ブラウザでは自動ログインを強制しない（フォールバック維持）
      if (liff.isInClient()) liff.login();
      return { inClient: liff.isInClient?.() ?? false };
    }
    const profile = await liff.getProfile();
    return {
      inClient: liff.isInClient?.() ?? true,
      displayName: profile.displayName,
      idToken: liff.getIDToken() ?? undefined,
    };
  } catch {
    return { inClient: false };
  }
}

import { test, expect } from '@playwright/test';

// 開発モック（Supabase未設定）で動作する前提のスモークE2E。
test('スマホ幅で席予約を完了できる', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: '席を予約する' })).toBeVisible();
  await page.getByRole('link', { name: '席を予約する' }).click();

  // STEP1 日付（木曜以外の最初の有効な日）
  const dateBtn = page.locator('button:not([disabled])').first();
  await dateBtn.click();

  // STEP2 時間
  const timeBtn = page.locator('button:not([disabled])').filter({ hasText: ':' }).first();
  await timeBtn.click();

  // STEP3 人数
  await page.getByRole('button', { name: '2名' }).click();

  // STEP4 情報入力
  await page.locator('#name').fill('テスト太郎');
  await page.locator('#phone').fill('09012345678');
  await page.getByRole('button', { name: '入力内容を確認する' }).click();

  // STEP5 確認 → 確定
  await page.getByRole('button', { name: 'この内容で予約する' }).click();

  // 完了
  await expect(page.getByText('ご予約が完了しました')).toBeVisible();
});

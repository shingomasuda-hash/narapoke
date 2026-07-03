import { test, expect } from '@playwright/test';

test('管理者が当日の予約を確認できる（開発モック）', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByText('ダッシュボード')).toBeVisible();
  await page.getByRole('link', { name: '席予約' }).click();
  await expect(page.getByText('本日の席予約')).toBeVisible();
});

test('管理者がメニューの売り切れを設定できる（開発モック）', async ({ page }) => {
  await page.goto('/admin/menu');
  await expect(page.getByText('メニュー管理')).toBeVisible();
  await page.getByRole('button', { name: '在庫あり' }).first().click();
});

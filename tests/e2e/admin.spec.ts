import { test, expect } from '@playwright/test';

test('管理者が当日の予約を確認できる（開発モック）', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: /ダッシュボード/ })).toBeVisible();
  await page.getByRole('link', { name: '席予約', exact: true }).click();
  await expect(page.getByRole('heading', { name: /席予約/ })).toBeVisible();
});

test('管理者がメニューの売り切れを設定できる（開発モック）', async ({ page }) => {
  await page.goto('/admin/menu');
  await expect(page.getByText('メニュー管理')).toBeVisible();
  const soldOutSelect = page.locator('select').filter({ hasText: '在庫あり' }).first();
  await soldOutSelect.selectOption('sold_out');
  await soldOutSelect.locator('xpath=following-sibling::button[1]').click();
});

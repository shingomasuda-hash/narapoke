import { test, expect } from '@playwright/test';

test('スマホ幅でテイクアウト注文を完了できる', async ({ page }) => {
  await page.goto('/takeout');
  await expect(page.getByText('商品を選ぶ')).toBeVisible();

  // 通常ドリンク（カスタマイズ不要な商品）を追加
  const addButtons = page.getByRole('button', { name: '追加' });
  await addButtons.last().click();

  await page.getByRole('button', { name: /カートを見る/ }).click();
  await page.getByRole('button', { name: '受取日時へ進む' }).click();

  // 受取日→時間
  await page.locator('button:not([disabled])').filter({ hasText: '/' }).first().click();
  await page.locator('button:not([disabled])').filter({ hasText: ':' }).first().click();
  await page.getByRole('button', { name: 'お客様情報へ' }).click();

  await page.locator('#tn').fill('テスト花子');
  await page.locator('#tp').fill('09087654321');
  await page.getByRole('button', { name: 'この内容で注文する' }).click();

  await expect(page.getByText('ご注文を承りました')).toBeVisible();
});

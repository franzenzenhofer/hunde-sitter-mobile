import { test, expect } from '@playwright/test';

test('boots and removes loading screen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('#boot')).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('viewport meta is mobile-first', async ({ page }) => {
  await page.goto('/');
  const viewport = await page.locator('meta[name=viewport]').getAttribute('content');
  expect(viewport).toContain('width=device-width');
  expect(viewport).toContain('viewport-fit=cover');
});

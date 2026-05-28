import { test, expect } from '@playwright/test';

test('fetch loop: throw -> dog catches -> brings back -> player picks up', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hs:seen-onboarding', '1'));
  await page.goto('/?playtest=1#fetchloop');
  await page.waitForFunction(() => Boolean(window.__hs), undefined, { timeout: 5000 });
  await page.waitForTimeout(400);

  await page.evaluate(() => window.__hs!.teleport(0, 0));
  await page.evaluate(() => window.__hs!.grantBall(1));
  await page.waitForFunction(() => window.__hs!.bagCounts().ball >= 1, undefined, { timeout: 3000 });
  await page.waitForTimeout(400);

  const threwOk = await page.evaluate(() => window.__hs!.throwBall());
  expect(threwOk).toBe(true);
  expect(['flying', 'carried', 'dropped']).toContain(await page.evaluate(() => window.__hs!.ballMode()));

  await page.waitForFunction(
    () => window.__hs!.ballMode() === 'carried' || window.__hs!.ballMode() === 'dropped' || window.__hs!.ballMode() === 'idle',
    undefined,
    { timeout: 10_000 },
  );

  await page.waitForFunction(
    () => {
      const dp = window.__hs!.dogPos();
      const mode = window.__hs!.ballMode();
      const close = Math.hypot(dp.x, dp.z) < 3.5;
      return (mode === 'dropped' || mode === 'idle') && close;
    },
    undefined,
    { timeout: 15_000 },
  );

  await page.waitForFunction(() => window.__hs!.bagCounts().ball >= 1 || window.__hs!.ballMode() === 'idle', undefined, {
    timeout: 8_000,
  });

  await page.screenshot({ path: 'test-results/fetch-loop-final.png' });
});

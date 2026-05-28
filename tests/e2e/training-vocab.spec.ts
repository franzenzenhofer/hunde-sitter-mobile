import { test, expect } from '@playwright/test';

test('training: clap+behavior+reward builds vocabulary', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hs:seen-onboarding', '1'));
  await page.goto('/?playtest=1#vocab');
  await page.waitForFunction(() => Boolean(window.__hs), undefined, { timeout: 5000 });
  await page.waitForTimeout(400);

  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => {
      window.__hs!.fireGesture('clap');
      window.__hs!.simulateBehavior('sit', true);
    });
    await page.waitForTimeout(40);
    await page.evaluate(() => window.__hs!.reward(1));
    await page.waitForTimeout(40);
  }

  const vocab = await page.evaluate(() => window.__hs!.vocabulary());
  expect(vocab.clap).toBeDefined();
  expect(vocab.clap?.sit).toBeDefined();
  expect(vocab.clap!.sit!.strength).toBeGreaterThan(0.4);
});

test('persistence: vocabulary survives reload', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hs:seen-onboarding', '1'));
  await page.goto('/?playtest=1#persist');
  await page.waitForFunction(() => Boolean(window.__hs), undefined, { timeout: 5000 });
  await page.waitForTimeout(400);

  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => {
      window.__hs!.fireGesture('whistle');
      window.__hs!.simulateBehavior('bark', true);
    });
    await page.waitForTimeout(30);
    await page.evaluate(() => window.__hs!.reward(1));
    await page.waitForTimeout(30);
  }
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => window.__hs!.vocabulary());
  expect(before.whistle?.bark?.strength).toBeGreaterThan(0.3);

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__hs), undefined, { timeout: 5000 });
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__hs!.vocabulary());
  expect(after.whistle?.bark?.strength).toBeGreaterThan(0.3);
});

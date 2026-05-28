import { test, expect } from '@playwright/test';

const BIOME_PROBES: Array<[number, number, string]> = [
  [0, 0, 'origin'],
  [200, 0, 'east'],
  [-200, 0, 'west'],
  [0, 200, 'south'],
  [0, -200, 'north'],
  [400, 400, 'far-se'],
];

test('playtest: explore + screenshot biomes', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.addInitScript(() => localStorage.setItem('hs:seen-onboarding', '1'));
  await page.goto('/?playtest=1#1337');
  await page.waitForFunction(() => Boolean(window.__hs), undefined, { timeout: 5000 });
  await page.waitForTimeout(500);

  const seen = new Set<string>();
  for (const [x, z, label] of BIOME_PROBES) {
    await page.evaluate(([x, z]) => window.__hs!.teleport(x as number, z as number), [x, z]);
    await page.waitForTimeout(800);
    const biome = await page.evaluate(([x, z]) => window.__hs!.biomeAt(x as number, z as number), [x, z]);
    seen.add(biome);
    await page.screenshot({
      path: info.outputPath(`biome-${label}-${biome}.png`),
      fullPage: false,
    });
  }

  await page.evaluate(() => window.__hs!.teleport(0, 0));
  await page.evaluate(() => window.__hs!.petDog());
  await page.waitForTimeout(400);
  const stats = await page.evaluate(() => window.__hs!.stats());

  await page.screenshot({ path: info.outputPath('after-pet.png') });

  expect(errors, errors.join('\n')).toEqual([]);
  expect(seen.size, `biomes visited: ${[...seen].join(',')}`).toBeGreaterThanOrEqual(2);
  expect(stats.love).toBeGreaterThan(80);
});

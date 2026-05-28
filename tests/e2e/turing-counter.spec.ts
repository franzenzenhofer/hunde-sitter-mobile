import { test, expect } from '@playwright/test';

test('turing: counter program counts to N inside the live engine', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hs:seen-onboarding', '1'));
  await page.goto('/?playtest=1#tc');
  await page.waitForFunction(() => Boolean(window.__hs), undefined, { timeout: 5000 });
  await page.waitForTimeout(300);

  const target = 8;
  const result = await page.evaluate(async (n) => {
    const program = {
      nodeId: 'while',
      children: [
        { nodeId: 'cell-lt', args: { cellId: 0, value: n } },
        { nodeId: 'cell-inc', args: { cellId: 0 } },
      ],
    };
    await window.__hs!.run(program);
    return window.__hs!.memoryDump();
  }, target);

  expect(result[0]).toBe(target);
});

test('turing: 2^N via nested while', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hs:seen-onboarding', '1'));
  await page.goto('/?playtest=1#pow');
  await page.waitForFunction(() => Boolean(window.__hs), undefined, { timeout: 5000 });
  await page.waitForTimeout(300);

  const exponent = 4;
  const result = await page.evaluate(async (exp) => {
    // initialise cell0=1 via cell-set, then square exp times.
    const init = {
      nodeId: 'cell-set',
      args: { cellId: 0 },
      children: [{ nodeId: 'const', args: { value: 1 } }],
    };
    await window.__hs!.run(init);
    await window.__hs!.run({
      nodeId: 'while',
      children: [
        { nodeId: 'cell-lt', args: { cellId: 1, value: exp } },
        {
          nodeId: 'seq',
          children: [
            {
              nodeId: 'cell-set',
              args: { cellId: 0 },
              children: [
                {
                  nodeId: 'mul',
                  children: [
                    { nodeId: 'cell-get', args: { cellId: 0 } },
                    { nodeId: 'const', args: { value: 2 } },
                  ],
                },
              ],
            },
            { nodeId: 'cell-inc', args: { cellId: 1 } },
          ],
        },
      ],
    });
    return window.__hs!.memoryDump();
  }, exponent);

  expect(result[0]).toBe(Math.pow(2, exponent));
});

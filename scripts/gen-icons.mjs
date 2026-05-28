import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const svgPath = join(root, 'public', 'favicon.svg');
const outDir = join(root, 'public', 'icons');
await mkdir(outDir, { recursive: true });

const svg = await readFile(svgPath, 'utf8');

async function render(size, name, maskable = false) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const padding = maskable ? Math.floor(size * 0.15) : 0;
  const inner = size - padding * 2;
  const html = `<!doctype html><html><body style="margin:0;background:#87ceeb;width:${size}px;height:${size}px;display:grid;place-items:center"><div style="width:${inner}px;height:${inner}px">${svg.replace('viewBox="0 0 64 64"', `viewBox="0 0 64 64" width="${inner}" height="${inner}"`)}</div></body></html>`;
  await page.setContent(html);
  const buf = await page.screenshot({ type: 'png', omitBackground: false });
  await writeFile(join(outDir, name), buf);
  console.log(`wrote ${name} (${buf.length} bytes)`);
  await browser.close();
}

await render(192, 'icon-192.png');
await render(512, 'icon-512.png');
await render(512, 'icon-maskable-512.png', true);
console.log('done');

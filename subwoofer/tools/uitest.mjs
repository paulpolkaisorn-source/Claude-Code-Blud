import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
await page.goto(pathToFileURL(resolve('dist/index.html')).href);
await page.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 120000 });
console.log('loaded in', ((Date.now() - t0) / 1000).toFixed(1), 's');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/ui_0.png` });
for (const [i, label] of ['Front', 'Rear ¾', 'Cone'].entries()) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/ui_${i + 1}.png` });
}
await page.getByRole('button', { name: 'Dark' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/ui_dark.png` });
console.log(logs.filter((l) => !l.includes('willReadFrequently')).join('\n') || 'no console output');
await browser.close();

import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export async function openHarness({ query = '', headless = true } = {}) {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
  const url = pathToFileURL(resolve('dist/index.html')).href + '?harness' + (query ? '&' + query : '');
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  return { browser, page, logs };
}

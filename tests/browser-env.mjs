// Shared Playwright setup: headless Chromium with WebGL (SwiftShader) and the three.js CDN routed to node_modules.
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CDN = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.170\.0\/(.*)$/;

export async function openBrowser({ viewport = { width: 1280, height: 720 }, mobile = false } = {}) {
  const server = await startServer(ROOT);
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  await context.route(CDN, (route) => {
    const rel = route.request().url().match(CDN)[1].split('?')[0];
    const file = path.join(ROOT, 'node_modules/three', rel);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: 'missing ' + rel });
    route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(file) });
  });
  const errors = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
  return { browser, context, page, server, errors, close: async () => { await browser.close(); server.close(); } };
}

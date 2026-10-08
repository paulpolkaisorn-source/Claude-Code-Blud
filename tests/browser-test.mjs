// Runs a browser test harness page and reports results.
// Usage: node tests/browser-test.mjs tests/browser/<name>.html [--mobile] [--timeout=30000]
// The page must set window.__TEST__ = { done:true, passed, failed, failures:[...] } (use tests/browser/harness.js).
import { openBrowser } from './browser-env.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: node tests/browser-test.mjs tests/browser/<name>.html [--mobile]'); process.exit(2); }
const mobile = process.argv.includes('--mobile');
const timeout = Number((process.argv.find((a) => a.startsWith('--timeout=')) || '--timeout=30000').split('=')[1]);
const env = await openBrowser(mobile ? { viewport: { width: 390, height: 844 }, mobile: true } : {});
let code = 1;
try {
  env.page.on('console', (m) => { if (m.type() !== 'error') console.log('  [page]', m.text()); });
  await env.page.goto(`${env.server.url}/${file.replace(/^\.?\//, '')}`);
  await env.page.waitForFunction(() => window.__TEST__ && window.__TEST__.done, null, { timeout });
  const r = await env.page.evaluate(() => window.__TEST__);
  for (const f of r.failures) console.log('  FAIL', f);
  for (const e of env.errors) console.log('  ERROR', e);
  console.log(`${file}: ${r.passed} passed, ${r.failed} failed, ${env.errors.length} page errors`);
  code = r.failed === 0 && env.errors.length === 0 ? 0 : 1;
} catch (e) {
  console.log('HARNESS TIMEOUT/ERROR:', e.message);
  for (const err of env.errors) console.log('  ERROR', err);
} finally {
  await env.close();
}
process.exit(code);

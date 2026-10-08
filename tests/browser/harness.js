// Tiny in-page test runner. import { test, assert, run } from './harness.js'; ... await run();
const tests = [];
export function test(name, fn) { tests.push({ name, fn }); }
export function assert(cond, msg = 'assertion failed') { if (!cond) throw new Error(msg); }
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const frames = (n = 1) => new Promise((r) => { let k = n; const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
export async function run() {
  const res = { done: false, passed: 0, failed: 0, failures: [] };
  for (const t of tests) {
    try { await t.fn(); res.passed++; console.log('ok -', t.name); }
    catch (e) { res.failed++; res.failures.push(`${t.name}: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
  }
  res.done = true;
  window.__TEST__ = res;
  return res;
}

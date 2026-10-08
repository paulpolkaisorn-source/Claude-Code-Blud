#!/usr/bin/env node
// `npm run qa` entry point. Runs the desktop, mobile and perf suites one after another in headless Chromium
// (sequential on purpose: SwiftShader is CPU-bound and parallel sessions would skew the numbers).
// Writes QA.md at the repo root and exits 1 if any check fails.
// Development filters (QA.md is only written for unfiltered runs):
//   node tests/qa/run-qa.mjs --suite=desktop --only=D09
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../browser-env.mjs';
import { Recorder } from './harness.mjs';
import { runDesktop } from './desktop.mjs';
import { runMobile } from './mobile.mjs';
import { runPerf } from './perf.mjs';
import { writeReport } from './report.mjs';

function parseArgs(argv) {
  const out = { suite: null, only: null };
  for (const arg of argv) {
    const m = arg.match(/^--(suite|only)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function playwrightVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/playwright/package.json'), 'utf8')).version;
  } catch {
    return 'unknown';
  }
}

const args = parseArgs(process.argv.slice(2));
const suites = args.suite ? args.suite.split(',') : ['desktop', 'mobile', 'perf'];
const filtered = Boolean(args.only || args.suite);
const rec = new Recorder(args.only ? new RegExp(args.only, 'i') : null);
const report = { perf: [], reference: null };
const runners = {
  desktop: () => runDesktop(rec),
  mobile: () => runMobile(rec, report),
  perf: () => runPerf(rec, report),
};

const started = Date.now();
for (const name of suites) {
  if (!runners[name]) {
    process.stderr.write(`unknown suite "${name}" (expected desktop, mobile, perf)\n`);
    process.exit(2);
  }
  process.stdout.write(`\n== ${name} ==\n`);
  try {
    await runners[name]();
  } catch (e) {
    const detail = String(e && e.message ? e.message : e).split('\n')[0];
    rec.rows.push({ id: name.toUpperCase(), area: 'Suite', name: `${name} suite aborted`, status: 'FAIL', ms: 0, detail });
    process.stdout.write(`FAIL ${name.toUpperCase()} ${name} suite aborted :: ${detail}\n`);
  }
}

const totalMs = Date.now() - started;
const passed = rec.rows.filter((r) => r.status === 'PASS').length;
const failed = rec.rows.filter((r) => r.status === 'FAIL').length;
process.stdout.write(`\n${passed} passed, ${failed} failed, ${rec.rows.length} checks in ${(totalMs / 1000).toFixed(0)} s\n`);
if (!filtered) {
  const file = writeReport(rec, report, { suites, filtered, totalMs, playwrightVersion: playwrightVersion() });
  process.stdout.write(`report written to ${file}\n`);
}
process.exit(failed ? 1 : 0);

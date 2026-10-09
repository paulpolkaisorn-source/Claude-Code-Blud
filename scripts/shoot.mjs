#!/usr/bin/env node
// Polish pass 1: screenshot sweep of the integrated page (the production build, served by vite preview).
//
// For each run the page opens once. The script waits for <html data-boot="ok"> and for html.gl-ready
// (15 s at most, or html.no-gl), then 1.5 s for the preloader handoff. Each section is scrolled to its
// top and to its middle (top + 0.5 x height; the footer is top only) with window.scrollTo, instant.
// After each scroll it waits 1800 ms, then saves the viewport to
// qa/shots/pass1/<section>-<width>-<top|mid>[-rm|-nogl].png. The 1440 run also saves the preloader frame,
// preloader-1440-boot.png: the last composited frame before loader:done, taken from a CDP screencast
// (a page screenshot lands after loader:done under software WebGL, so it cannot show the preloader).
//
// Outputs:
//   qa/shots/pass1/*.png              the screenshots
//   qa/shots/pass1/manifest.json      per run: timings, overflow probes, screenshot list, skips
//   qa/reports/pass1-console.json     every console message, page error and failed request, all runs
//
// A later call with --runs replaces only the runs it executes, so the sweep can be split across calls.
// A screenshot that takes longer than 60 s limits the 2560 run to the hero, family and closing sections.
// --boot-only (with --runs=1440) re-captures only the preloader frame and keeps the rest of that run.
//
// Usage:
//   node scripts/shoot.mjs [--runs=375,768,1440,2560,1440-rm,375-rm,1440-nogl,375-nogl] [--base=http://127.0.0.1:4190/] [--boot-only]
// PW_CHROMIUM overrides the browser binary. Otherwise the Playwright default applies.

/* eslint-disable no-console -- command-line sweep; console is its output */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOT_DIR = resolve(ROOT, 'qa/shots/pass1');
const MANIFEST_PATH = resolve(SHOT_DIR, 'manifest.json');
const CONSOLE_PATH = resolve(ROOT, 'qa/reports/pass1-console.json');

const SECTIONS = ['hero', 'speed', 'capabilities', 'code', 'family', 'pricing', 'closing', 'footer'];
const SLOW_MODE_KEEP = ['hero', 'family', 'closing'];

const SETTLE_MS = 1800; // after each scroll: scrubbed values and the choreography settle
const HANDOFF_MS = 1500; // after gl-ready: the preloader handoff (1.10 s after loader:done)
const GL_WAIT_MS = 15_000;
const BOOT_WAIT_MS = 60_000;
const SHOT_TIMEOUT_MS = 120_000;
const SLOW_SHOT_MS = 60_000;
const START_CUTOFF_MS = 34 * 60_000; // a run that would start later than this is skipped and recorded

/** Every run of the sweep. Extra runs (-rm, -nogl) take the top position of each section only. */
const RUNS = [
  { id: '375', width: 375, height: 812, suffix: '', positions: 'both' },
  { id: '768', width: 768, height: 1024, suffix: '', positions: 'both' },
  { id: '1440', width: 1440, height: 900, suffix: '', positions: 'both', boot: true },
  { id: '2560', width: 2560, height: 1440, suffix: '', positions: 'both', slowFallback: true },
  { id: '1440-rm', width: 1440, height: 900, suffix: '-rm', positions: 'top', reduced: true },
  { id: '375-rm', width: 375, height: 812, suffix: '-rm', positions: 'top', reduced: true },
  { id: '1440-nogl', width: 1440, height: 900, suffix: '-nogl', positions: 'top', noGl: true },
  { id: '375-nogl', width: 375, height: 812, suffix: '-nogl', positions: 'top', noGl: true },
];

const pause = (ms) => new Promise((resolvePause) => setTimeout(resolvePause, ms));

function parseArgs(argv) {
  const opts = { base: 'http://127.0.0.1:4190/', runs: RUNS.map((run) => run.id), bootOnly: false };
  for (const arg of argv) {
    if (arg === '--boot-only') {
      opts.bootOnly = true;
      continue;
    }
    const match = /^--([a-z]+)=(.*)$/.exec(arg);
    if (!match) throw new Error(`unknown argument: ${arg}`);
    if (match[1] === 'base') opts.base = match[2];
    else if (match[1] === 'runs') opts.runs = match[2].split(',').filter(Boolean);
    else throw new Error(`unknown option: --${match[1]}`);
  }
  for (const id of opts.runs) {
    if (!RUNS.some((run) => run.id === id)) throw new Error(`unknown run: ${id}`);
  }
  return opts;
}

/**
 * Runs in the page before any script. Records performance.now() when boot, gl-ready, no-gl and
 * loader:done happen. loader:done is read from the preloader readout, which is hidden in the same
 * synchronous step as the event (preloader.ts onDone). The observer only reads, so it changes nothing.
 */
function timingProbe() {
  const times = (window.__qaTimes = {});
  const mark = (key) => {
    if (times[key] === undefined) times[key] = performance.now();
  };
  new MutationObserver((records) => {
    const html = document.documentElement;
    if (html) {
      if (html.getAttribute('data-boot') === 'ok') mark('boot');
      if (html.classList.contains('gl-ready')) mark('glReady');
      if (html.classList.contains('no-gl')) mark('noGl');
    }
    for (const record of records) {
      if (
        record.type === 'attributes' &&
        record.attributeName === 'hidden' &&
        record.target instanceof Element &&
        record.target.hasAttribute('data-readout')
      ) {
        mark('loaderDone');
      }
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class', 'data-boot', 'hidden'] });
}

function timingsRead() {
  const times = window.__qaTimes || {};
  const head = performance.getEntriesByName('head-env')[0];
  const nav = performance.getEntriesByType('navigation')[0];
  return {
    boot: times.boot ?? null,
    glReady: times.glReady ?? null,
    noGl: times.noGl ?? null,
    loaderDone: times.loaderDone ?? null,
    headEnv: head ? { startTime: head.startTime, duration: head.duration } : null,
    domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
    load: nav ? nav.loadEventEnd : null,
    htmlClass: document.documentElement.className,
  };
}

function pageMetrics() {
  const root = document.documentElement;
  return {
    scrollHeight: root.scrollHeight,
    scrollWidth: root.scrollWidth,
    clientWidth: root.clientWidth,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    bodyScrollWidth: document.body.scrollWidth,
    htmlClass: root.className,
  };
}

/**
 * Walks every rendered element and lists those whose right edge is past the viewport. An element
 * inside an ancestor that clips or scrolls horizontally is marked contained. position shows whether it
 * is fixed or absolute. scrollWidth above innerWidth means the document itself scrolls sideways.
 */
function overflowProbe() {
  const innerWidth = window.innerWidth;
  const root = document.documentElement;
  const contained = (el) => {
    for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'hidden' || ox === 'clip' || ox === 'auto' || ox === 'scroll') return true;
    }
    return false;
  };
  const offenders = [];
  let count = 0;
  for (const el of document.body.querySelectorAll('*')) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.right <= innerWidth + 0.5) continue;
    count += 1;
    if (offenders.length < 25) {
      const section = el.closest('section, footer');
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      offenders.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        cls: cls || null,
        section: section ? section.id || null : null,
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        right: Math.round(rect.right),
        position: style.position,
        contained: contained(el),
      });
    }
  }
  return { innerWidth, scrollWidth: root.scrollWidth, count, offenders };
}

/** A section's absolute top and height, read from the current layout. */
function sectionBox(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { top: rect.top + window.scrollY, height: rect.height };
}

/**
 * The preloader frame: the last composited frame before loader:done. A page screenshot cannot serve for
 * this under software WebGL. It resolves 4 to 8 s after navigation, after loader:done at 0.6 to 1.0 s, so
 * the frame it saves is already the settled hero. A CDP screencast delivers each frame as it is composited,
 * so it can. The frame's compositor timestamp is compared with loader:done (performance.timeOrigin + t).
 * The navigation itself happens here, after the screencast has started, so no early frame is missed.
 */
async function captureBootFrame(context, page, url) {
  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', (ev) => {
    const ts = ev.metadata?.timestamp;
    const epochMs = ts && Math.abs(ts * 1000 - Date.now()) < 60_000 ? ts * 1000 : Date.now();
    frames.push({ data: ev.data, epochMs });
    cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => undefined);
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  let done = null;
  const deadline = Date.now() + BOOT_WAIT_MS;
  while (done === null && Date.now() < deadline) {
    done = await page
      .evaluate(() =>
        window.__qaTimes && window.__qaTimes.loaderDone !== undefined
          ? { origin: performance.timeOrigin, t: window.__qaTimes.loaderDone }
          : null,
      )
      .catch(() => null);
    if (done === null) await pause(50);
  }
  await cdp.send('Page.stopScreencast').catch(() => undefined);
  const origin = done ? done.origin : null;
  const loaderDoneEpoch = done ? done.origin + done.t : null;
  const before = loaderDoneEpoch === null ? [] : frames.filter((f) => f.epochMs <= loaderDoneEpoch);
  const chosen = before.length ? before[before.length - 1] : (frames[frames.length - 1] ?? null);
  if (chosen) writeFileSync(resolve(SHOT_DIR, 'preloader-1440-boot.png'), Buffer.from(chosen.data, 'base64'));
  await cdp.detach().catch(() => undefined);
  return {
    file: 'qa/shots/pass1/preloader-1440-boot.png',
    method: 'CDP screencast: last composited frame before loader:done',
    framesCaptured: frames.length,
    frameAtMs: chosen && origin !== null ? Math.round(chosen.epochMs - origin) : null,
    loaderDoneMs: done ? Math.round(done.t) : null,
    beforeLoaderDone: before.length > 0,
  };
}

async function shootAt(page, run, id, pos, target, box) {
  const top = Math.max(0, Math.round(target));
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: 'instant' }), top);
  await pause(SETTLE_MS);
  const at = await page.evaluate(() => ({
    scrollY: window.scrollY,
    maxScroll: document.documentElement.scrollHeight - window.innerHeight,
  }));
  const name = `${id}-${run.width}-${pos}${run.suffix}.png`;
  const started = Date.now();
  await page.screenshot({ path: resolve(SHOT_DIR, name), timeout: SHOT_TIMEOUT_MS });
  const shotMs = Date.now() - started;
  const overflow = await page.evaluate(overflowProbe);
  return {
    file: `qa/shots/pass1/${name}`,
    run: run.id,
    section: id,
    width: run.width,
    height: run.height,
    position: pos,
    sectionTop: Math.round(box.top),
    sectionHeight: Math.round(box.height),
    targetY: top,
    scrollY: Math.round(at.scrollY),
    maxScroll: Math.round(at.maxScroll),
    shotMs,
    overflow,
  };
}

async function runOne(browser, run, state) {
  const context = await browser.newContext({
    viewport: { width: run.width, height: run.height },
    deviceScaleFactor: 1,
    ...(run.reduced ? { reducedMotion: 'reduce' } : {}),
  });
  const page = await context.newPage();
  const log = {
    id: run.id,
    width: run.width,
    height: run.height,
    reducedMotion: Boolean(run.reduced),
    noGl: Boolean(run.noGl),
    url: run.noGl ? `${state.base}?nogl` : state.base,
    startedAt: new Date().toISOString(),
    console: [],
    pageErrors: [],
    failedRequests: [],
    shots: [],
    skipped: [],
    errors: [],
  };
  page.on('console', (msg) => {
    log.console.push({ type: msg.type(), text: msg.text(), location: msg.location() });
  });
  page.on('pageerror', (err) => {
    log.pageErrors.push({ message: err.message, stack: err.stack ?? null });
  });
  page.on('requestfailed', (req) => {
    log.failedRequests.push({
      kind: 'requestfailed',
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      failure: req.failure()?.errorText ?? null,
    });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) log.failedRequests.push({ kind: 'http-status', url: res.url(), status: res.status() });
  });
  page.on('crash', () => log.pageErrors.push({ message: 'page crashed' }));
  await page.addInitScript(timingProbe);

  try {
    if (run.boot) {
      log.bootFrame = await captureBootFrame(context, page, log.url);
      console.log(
        `[${run.id}] preloader-1440-boot.png: frame at ${log.bootFrame.frameAtMs} ms, loader:done at ${log.bootFrame.loaderDoneMs} ms (before: ${log.bootFrame.beforeLoaderDone})`,
      );
    } else {
      await page.goto(log.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    }
    if (state.bootOnly) return log;
    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-boot') === 'ok',
      undefined,
      { timeout: BOOT_WAIT_MS, polling: 100 },
    );
    const glStart = Date.now();
    const glReady = await page
      .waitForFunction(
        () => document.documentElement.classList.contains('gl-ready') || document.documentElement.classList.contains('no-gl'),
        undefined,
        { timeout: GL_WAIT_MS, polling: 100 },
      )
      .then(() => true, () => false);
    log.glWait = { ready: glReady, waitedMs: Date.now() - glStart };
    console.log(`[${run.id}] boot ok; gl-ready or no-gl: ${glReady} after ${log.glWait.waitedMs} ms`);
    await pause(HANDOFF_MS);
    log.timings = await page.evaluate(timingsRead);
    log.metricsAtLoad = await page.evaluate(pageMetrics);
    log.overflowAtLoad = await page.evaluate(overflowProbe);

    for (const id of SECTIONS) {
      if (run.slowFallback && state.slowMode && !SLOW_MODE_KEEP.includes(id)) {
        log.skipped.push({
          section: id,
          reason: 'a screenshot took over 60 s earlier in the sweep, so the 2560 run keeps only hero, family and closing',
        });
        console.log(`[${run.id}] ${id} skipped (slow-screenshot rule)`);
        continue;
      }
      const positions = id === 'footer' || run.positions === 'top' ? ['top'] : ['top', 'mid'];
      for (const pos of positions) {
        const box = await page.evaluate(sectionBox, id);
        if (box === null) {
          log.errors.push(`section #${id} is not in the page`);
          break;
        }
        const target = pos === 'top' ? box.top : box.top + 0.5 * box.height;
        const shot = await shootAt(page, run, id, pos, target, box);
        log.shots.push(shot);
        console.log(`[${run.id}] ${id} ${pos} scrollY=${shot.scrollY} (max ${shot.maxScroll}) shot=${shot.shotMs} ms`);
        if (shot.shotMs > SLOW_SHOT_MS) {
          state.slowMode = true;
          console.log(`[${run.id}] screenshot over 60 s: slow-screenshot rule armed`);
        }
      }
    }
  } catch (err) {
    log.errors.push(String(err && err.stack ? err.stack : err));
    console.log(`[${run.id}] error: ${String(err && err.message ? err.message : err).split('\n')[0]}`);
  } finally {
    await context.close().catch(() => undefined);
    log.finishedAt = new Date().toISOString();
  }
  return log;
}

/** Per run: the union of overflow offenders across every probe, and whether the document scrolls sideways. */
function overflowSummary(log) {
  const probes = [
    { at: 'load', ...(log.overflowAtLoad ?? {}) },
    ...log.shots.map((shot) => ({ at: `${shot.section} ${shot.position}`, ...shot.overflow })),
  ].filter((probe) => typeof probe.innerWidth === 'number');
  const seen = new Map();
  for (const probe of probes) {
    for (const o of probe.offenders ?? []) {
      const key = [o.tag, o.id, o.cls, o.section, o.text].join('|');
      const entry = seen.get(key);
      if (entry) {
        if (entry.at.length < 5) entry.at.push(probe.at);
      } else {
        seen.set(key, { ...o, at: [probe.at] });
      }
    }
  }
  return {
    horizontalScroll: probes.some((probe) => probe.scrollWidth > probe.innerWidth),
    maxScrollWidth: probes.length ? Math.max(...probes.map((probe) => probe.scrollWidth)) : null,
    probesWithOffenders: probes.filter((probe) => probe.count > 0).length,
    probes: probes.length,
    offenders: [...seen.values()],
  };
}

function consoleReport(manifest) {
  const messages = [];
  const pageErrors = [];
  const failedRequests = [];
  const runIds = RUNS.map((run) => run.id).filter((id) => manifest.runs[id]);
  for (const id of runIds) {
    const log = manifest.runs[id];
    for (const m of log.console ?? []) messages.push({ run: id, ...m });
    for (const e of log.pageErrors ?? []) pageErrors.push({ run: id, ...e });
    for (const f of log.failedRequests ?? []) failedRequests.push({ run: id, ...f });
  }
  const byType = {};
  for (const m of messages) byType[m.type] = (byType[m.type] ?? 0) + 1;
  const distinct = new Map();
  for (const m of messages) {
    const key = `${m.type}\u0001${m.text}`;
    const entry = distinct.get(key) ?? { type: m.type, text: m.text, count: 0, runs: [], location: m.location };
    entry.count += 1;
    if (!entry.runs.includes(m.run)) entry.runs.push(m.run);
    distinct.set(key, entry);
  }
  return {
    generatedAt: new Date().toISOString(),
    base: manifest.base,
    runs: runIds,
    summary: {
      consoleMessages: messages.length,
      byType,
      distinctMessages: [...distinct.values()],
      pageErrors: pageErrors.length,
      failedRequests: failedRequests.length,
    },
    messages,
    pageErrors,
    failedRequests,
  };
}

function saveManifest(manifest) {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  mkdirSync(SHOT_DIR, { recursive: true });
  mkdirSync(dirname(CONSOLE_PATH), { recursive: true });
  const manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
    : { sweepStartedAt: new Date().toISOString(), base: opts.base, slowMode: false, runs: {} };
  manifest.base = opts.base;
  const sweepStart = Date.parse(manifest.sweepStartedAt);

  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
  const stop = async () => {
    await browser.close().catch(() => undefined);
    process.exit(130);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    for (const run of RUNS) {
      if (!opts.runs.includes(run.id)) continue;
      if (opts.bootOnly && !run.boot) continue;
      const elapsed = Date.now() - sweepStart;
      if (elapsed > START_CUTOFF_MS && !opts.bootOnly) {
        manifest.runs[run.id] = {
          id: run.id,
          width: run.width,
          skippedRun: `not started: ${Math.round(elapsed / 1000)} s into the sweep, past the ${START_CUTOFF_MS / 60_000}-minute start cutoff`,
        };
        console.log(`[${run.id}] skipped: past the start cutoff`);
      } else if (opts.bootOnly) {
        // Re-captures only the preloader frame. The run's other screenshots and records stay as they are.
        const state = { base: opts.base, slowMode: manifest.slowMode === true, bootOnly: true };
        const fresh = await runOne(browser, run, state);
        const prev = manifest.runs[run.id];
        if (prev) {
          prev.bootFrame = fresh.bootFrame ?? null;
          prev.bootFrameErrors = fresh.errors;
        } else {
          manifest.runs[run.id] = fresh;
        }
        console.log(`[${run.id}] boot frame re-captured (other records of this run unchanged)`);
      } else {
        const state = { base: opts.base, slowMode: manifest.slowMode === true, bootOnly: false };
        console.log(`[${run.id}] start at ${Math.round(elapsed / 1000)} s into the sweep`);
        manifest.runs[run.id] = await runOne(browser, run, state);
        manifest.slowMode = state.slowMode;
      }
      manifest.sweepEndedAt = new Date().toISOString();
      saveManifest(manifest);
      writeFileSync(CONSOLE_PATH, `${JSON.stringify(consoleReport(manifest), null, 2)}\n`);
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  const shotCount = RUNS.reduce((n, run) => n + (manifest.runs[run.id]?.shots?.length ?? 0) + (manifest.runs[run.id]?.bootFrame ? 1 : 0), 0);
  const report = consoleReport(manifest);
  console.log(`done: ${shotCount} screenshots recorded, ${report.summary.consoleMessages} console messages, ${report.summary.pageErrors} page errors, ${report.summary.failedRequests} failed requests, slowMode=${manifest.slowMode}`);
  for (const run of RUNS) {
    const log = manifest.runs[run.id];
    if (!log) continue;
    const summary = log.skippedRun ? log.skippedRun : `shots=${log.shots?.length ?? 0} skipped=${log.skipped?.length ?? 0} errors=${log.errors?.length ?? 0}`;
    console.log(`  ${run.id}: ${summary}`);
  }
  // Overflow and timing digests for the report (stdout only; the manifest holds the full detail).
  for (const run of RUNS) {
    const log = manifest.runs[run.id];
    if (!log || log.skippedRun) continue;
    const ov = overflowSummary(log);
    const t = log.timings ?? {};
    console.log(
      `  ${run.id}: scrollHeight=${log.metricsAtLoad?.scrollHeight} scrollWidth=${log.metricsAtLoad?.scrollWidth} innerWidth=${log.width} ` +
        `horizontalScroll=${ov.horizontalScroll} offenders=${ov.offenders.length} | ` +
        `boot=${t.boot !== null && t.boot !== undefined ? Math.round(t.boot) : 'n/a'} ms glReady=${t.glReady !== null && t.glReady !== undefined ? Math.round(t.glReady) : 'n/a'} ms ` +
        `loaderDone=${t.loaderDone !== null && t.loaderDone !== undefined ? Math.round(t.loaderDone) : 'n/a'} ms ` +
        `headEnv=${t.headEnv ? t.headEnv.duration.toFixed(1) : 'n/a'} ms`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

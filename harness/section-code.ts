// Harness for the code section's 2D layer, src/sections/code/code.ts (architecture section 10a; direction-act2, code).
// Open /harness/section-code.html on the dev server, optionally with ?nogl (html.no-gl, the static recede shows).
// The page starts the section as the boot does, emits loader:done after its first tick and runs the checks on the
// next tick. The verdict lands in dataset.harness ('pass' or 'fail:<names>') and the checks in dataset.harnessChecks.
// The scroll states (stream and marker at p 0.25, 0.5 and 0.75) are read by the Playwright driver, not here.
import { bus } from '../src/core/bus';
import { env } from '../src/core/env';
import { registerEases } from '../src/core/ease';
import { initHover } from '../src/core/hover';
import { initScroll } from '../src/core/scroll';
import { addTick, initTicker, PRIORITY } from '../src/core/ticker';
import { initCode } from '../src/sections/code/code';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

/** The copy, verbatim from content/copy.md section code (D16.1 for the request, at most 11 lines). */
const KICKER = 'The API';
const TITLE = 'In code';
const INTRO =
  'On the Claude Platform, developers can get started with claude-haiku-5-5. This request streams the reply and sets effort to low.';
const REQUEST_LABEL = 'REQUEST';
const RESPONSE_LABEL = 'EXAMPLE OUTPUT';
const REQUEST: readonly string[] = [
  'import Anthropic from "@anthropic-ai/sdk";',
  'const client = new Anthropic();',
  'const ticket = "Charged twice for one seat.";',
  '',
  'await client.messages',
  '  .stream({',
  '    model: "claude-haiku-5-5", max_tokens: 1024,',
  '    output_config: { effort: "low" },',
  '    messages: [{ role: "user", content: ticket }],',
  '  })',
  '  .on("text", (t) => process.stdout.write(t));',
];
const RESPONSE: readonly string[] = [
  'The customer was charged twice for one seat.',
  'Refund the second charge.',
  'Bill the seat once from now on.',
];
const SR_CODE =
  'Short TypeScript program that streams a reply from Claude Haiku 5.5 with effort set to low, and an example of that reply.';

const root = document.documentElement;
const checks: Check[] = [];

function record(name: string, ok: boolean, detail = ''): void {
  checks.push({ name, ok, detail });
}

function lineTexts(block: string): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`${block} .code__line`)).map((line) => line.textContent ?? '');
}

function sameLines(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((line, i) => line === b[i]);
}

function runChecks(section: HTMLElement): void {
  record('section#code present', section.id === 'code');
  record(
    'section attributes: class, theme ink, act 2, labelled by code-title',
    section.classList.contains('section--code') &&
      section.dataset.theme === 'ink' &&
      section.dataset.act === '2' &&
      section.getAttribute('aria-labelledby') === 'code-title',
  );

  const title = document.getElementById('code-title');
  record('h2#code-title is the title', title?.tagName === 'H2' && title.textContent === TITLE, String(title?.textContent));
  record('kicker copy', document.querySelector('.code__kicker')?.textContent === KICKER);
  record('intro copy verbatim', document.querySelector('.code__intro')?.textContent === INTRO);
  record('request label copy', document.getElementById('code-request-label')?.textContent === REQUEST_LABEL);
  record('response label copy', document.getElementById('code-response-label')?.textContent === RESPONSE_LABEL);
  record('sr description copy', document.getElementById('code-sr')?.textContent === SR_CODE);

  const copy = document.querySelector<HTMLButtonElement>('.code__copy');
  record(
    'copy button copy and copied label',
    copy?.textContent === 'Copy' && copy.dataset.copiedLabel === 'Copied',
    `${copy?.textContent ?? ''} / ${copy?.dataset.copiedLabel ?? ''}`,
  );

  const request = lineTexts('.code__code--request');
  const response = lineTexts('.code__code--response');
  record('request lines verbatim (11)', sameLines(request, REQUEST), `${request.length} lines`);
  record('response lines verbatim (3)', sameLines(response, RESPONSE), `${response.length} lines`);
  record(
    'request at most 11 lines of at most 52 characters (D16.1)',
    request.length <= 11 && request.every((line) => line.length <= 52),
    `longest ${Math.max(...request.map((line) => line.length))}`,
  );
  record(
    'response at most 4 lines of at most 52 characters (D16.1)',
    response.length <= 4 && response.every((line) => line.length <= 52),
    `longest ${Math.max(...response.map((line) => line.length))}`,
  );

  const responseChars = document.querySelectorAll('.code__code--response .code__char').length;
  const responseLength = RESPONSE.reduce((sum, line) => sum + line.length, 0);
  record('response split into one span per character', responseChars === responseLength, `${responseChars} of ${responseLength}`);

  const panel = document.querySelector<HTMLElement>('.code__panel');
  const marker = document.querySelector<HTMLElement>('.code__marker');
  record('panel is live and the marker is measured', panel?.classList.contains('is-live') === true && parseFloat(marker?.style.height ?? '0') > 0, marker?.style.height ?? '');

  const lit = document.querySelectorAll('.code__code--response .code__char.is-lit').length;
  if (env.reducedMotion) {
    record('reduced motion: no title split', document.querySelectorAll('.code__title-char').length === 0);
    record('reduced motion: response in token colours from the start', lit === responseLength, `${lit} lit`);
    record('reduced motion: stream not dimmed', response.length > 0 && !document.querySelector('.code__code--response.is-stream'));
  } else {
    const glyphs = document.querySelectorAll('.code__title-char').length;
    record('title split into characters', glyphs > 0, `${glyphs} characters`);
    record('title keeps its full text as an accessible name', title?.getAttribute('aria-label') === TITLE, String(title?.getAttribute('aria-label')));
    record('stream at p 0 has no lit characters', lit === 0, `${lit} lit`);
    record('response dimmed by the stream class', !!document.querySelector('.code__code--response.is-stream'));
  }

  // The marker sits on line 1 at p 0 (on reduced motion as well, the marker is on line 1).
  const first = document.querySelector<HTMLElement>('.code__code--request .code__line');
  const origin = panel?.getBoundingClientRect();
  const firstTop = first && origin ? first.getBoundingClientRect().top - origin.top - (panel?.clientTop ?? 0) : NaN;
  const markerY = marker ? new DOMMatrixReadOnly(getComputedStyle(marker).transform === 'none' ? undefined : getComputedStyle(marker).transform).m42 : NaN;
  record('marker on line 1 at p 0', Math.abs(markerY - firstTop) < 1, `marker ${markerY.toFixed(1)} line ${firstTop.toFixed(1)}`);
}

const el = document.getElementById('code');
if (el === null) throw new Error('harness: #code is missing');

registerEases();
initTicker();
initScroll();
initHover();
initCode({ el, reducedMotion: env.reducedMotion, gl: false });

let frames = 0;
const stop = addTick(() => {
  frames += 1;
  if (frames === 1) {
    bus.emit('loader:done');
    return;
  }
  stop();
  runChecks(el);
  const failed = checks.filter((check) => !check.ok).map((check) => check.name);
  root.dataset.harnessChecks = JSON.stringify(checks);
  root.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join(' | ')}`;
}, PRIORITY.state);

// Harness for the code section's 2D layer, src/sections/code/code.ts (architecture section 10a; direction-act2, code).
// Open /harness/section-code.html on the dev server, optionally with ?nogl (html.no-gl, the static recede shows).
// The page starts the section as the boot does, emits loader:done after its first tick and runs the checks on the
// next tick. The verdict lands in dataset.harness ('pass' or 'fail:<names>') and the checks in dataset.harnessChecks.
// The scroll states are read by the Playwright driver, not here. The windows are set at layout time (D23.4): the request
// types from the progress at which its first code line reaches 85 per cent of the viewport height, over 0.30, and the
// response streams over the next 0.25. At p 0 nothing is typed or streamed, the request caret waits at the start of the
// request, and the kireji of the no-WebGL recede is in the seal token (D21.3, D21.5, D23.4).
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

  const groups = Array.from(document.querySelectorAll<HTMLElement>('.code__code--request .code__group'));
  const typedGroups = groups.filter((group) => !group.classList.contains('is-untyped')).length;
  const groupText = groups.map((group) => group.textContent ?? '').join('');
  record('request groups rejoin to the request text', groups.length > 0 && groupText === request.join(''), `${groups.length} groups`);
  // A group is a token, or 2 to 4 characters of a longer token. Single characters are only lone punctuation or digits.
  const singles = groups.filter((group) => (group.textContent ?? '').trim().length === 1).length;
  record('single-character groups are a minority (D21.3 rhythm)', groups.length > 0 && singles / groups.length < 0.4, `${singles} of ${groups.length}`);

  const caret = document.querySelector<HTMLElement>('.code__caret');
  const firstLine = document.querySelector<HTMLElement>('.code__code--request .code__line');
  const probe = document.createElement('span');
  probe.style.color = 'var(--seal-text)';
  section.append(probe);
  const sealText = getComputedStyle(probe).color;
  probe.remove();
  const kireji = document.querySelector<SVGRectElement>('.code__kireji');
  const sealFill = kireji ? getComputedStyle(kireji).fill : '';
  const sealBlock = document.createElement('span');
  sealBlock.style.color = 'var(--seal)';
  section.append(sealBlock);
  const sealRgb = getComputedStyle(sealBlock).color;
  sealBlock.remove();
  record('kireji of the no-WebGL recede is the seal token', sealFill === sealRgb && sealRgb !== '', `${sealFill} / ${sealRgb}`);

  const panel = document.querySelector<HTMLElement>('.code__panel');
  const marker = document.querySelector<HTMLElement>('.code__marker');
  record('panel is live and the marker is measured', panel?.classList.contains('is-live') === true && parseFloat(marker?.style.height ?? '0') > 0, marker?.style.height ?? '');

  const lit = document.querySelectorAll('.code__code--response .code__char.is-lit').length;
  // The request's caret is the first in the document and the response's the second; the response's sits in its <pre>.
  const responseCaret = document.querySelectorAll<HTMLElement>('.code__caret')[1] ?? null;
  const responseFirst = document.querySelector<HTMLElement>('.code__code--response .code__char');
  record(
    'both carets are hidden from the accessibility tree',
    caret?.getAttribute('aria-hidden') === 'true' && responseCaret?.getAttribute('aria-hidden') === 'true',
  );
  if (env.reducedMotion) {
    record('reduced motion: no title split', document.querySelectorAll('.code__title-char').length === 0);
    record('reduced motion: response shown whole at once', lit === responseLength, `${lit} of ${responseLength} lit`);
    record('reduced motion: no stream class', response.length > 0 && !document.querySelector('.code__code--response.is-stream'));
    record('reduced motion: request shown at once', typedGroups === groups.length, `${typedGroups} of ${groups.length} typed`);
    record('reduced motion: no caret', caret?.hidden === true && responseCaret?.hidden === true);
  } else {
    const glyphs = document.querySelectorAll('.code__title-char').length;
    record('title split into characters', glyphs > 0, `${glyphs} characters`);
    record('title keeps its full text as an accessible name', title?.getAttribute('aria-label') === TITLE, String(title?.getAttribute('aria-label')));
    record('stream at p 0 has no lit characters', lit === 0, `${lit} lit`);
    record(
      'unstreamed response characters are transparent (is-stream)',
      !!document.querySelector('.code__code--response.is-stream') &&
        responseFirst !== null &&
        getComputedStyle(responseFirst).color === 'rgba(0, 0, 0, 0)',
      responseFirst ? getComputedStyle(responseFirst).color : 'none',
    );
    record('typing at p 0: no group typed yet', typedGroups === 0, `${typedGroups} typed`);
    record('request caret at the start of the request', caret !== null && caret.hidden === false && caret.style.left === '0px', caret?.style.left ?? 'none');
    record('response caret hidden at p 0', responseCaret?.hidden === true, '');
    const caretStyle = caret ? getComputedStyle(caret) : null;
    record('caret is 2 px wide in seal-text', caretStyle?.width === '2px' && caretStyle.backgroundColor === sealText, `${caretStyle?.width} ${caretStyle?.backgroundColor}`);
    const lineHeight = firstLine?.getBoundingClientRect().height ?? 0;
    record('caret is one line tall', Math.abs(parseFloat(caretStyle?.height ?? '0') - lineHeight) < 0.5, `${caretStyle?.height} / ${lineHeight}`);
    record('marker waits while the request types', !!panel && getComputedStyle(marker ?? panel).visibility === 'hidden', '');
  }

  // The marker sits on line 1 at p 0 (on reduced motion as well, the marker is on line 1).
  const first = firstLine;
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

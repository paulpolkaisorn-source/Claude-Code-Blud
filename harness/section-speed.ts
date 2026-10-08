// Harness for the speed section's 2D layer, src/sections/speed/speed.ts (architecture section 10a; direction-act1 speed).
// Open /harness/section-speed.html on the dev server, optionally with ?nogl (html.no-gl, the static race shows). The page
// starts the section as the boot does and emits loader:done after the first tick. The copy, the stream arithmetic and the
// object-layer placement are checked here, and so is the boundary rule (D25.3): the layer and the "17" label go when the
// next section's top passes above the dimension line, which the harness scrolls to. The verdict lands in dataset.harness
// ('pass' or 'fail:<names>'), and the checks in window.__speedChecks. The scroll states are checked by the Playwright
// script, which reads the same attributes.
import { bus } from '../src/core/bus';
import { env } from '../src/core/env';
import { registerEases } from '../src/core/ease';
import { initHover } from '../src/core/hover';
import { initScroll } from '../src/core/scroll';
import { addTick, initTicker, PRIORITY } from '../src/core/ticker';
import { boundsOf, formationRects, viewportSize } from '../src/core/projection';
import { initSpeed } from '../src/sections/speed/speed';
import { STREAM_TOKENS, streamOffsets, streamRate } from '../src/sections/speed/speed-stream';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

const COPY = {
  kicker: 'Speed',
  title: 'Fastest',
  source: 'Comparative latency, relative to the current lineup.',
  footnote: '1\u00a0At each model’s standard speed, although it runs less quickly than our Opus models in Fast Mode.',
  support: 'The model selection matrix lists Haiku\u00a05.5 under “The lowest latency and price.”',
  label: 'Example output',
  prompt: 'Summarize this support ticket in a few sentences.',
  stream:
    'The customer reports a cracked screen and asks for a replacement before the weekend. They ask whether the damaged item must be returned. The order is confirmed and the item is in stock. A replacement ships with a return label.',
  race: 'Seventeen blocks race in formation across the screen, and they streak faster as the reader scrolls.',
};

const root = document.documentElement;
const checks: Check[] = [];

function check(name: string, ok: boolean, detail = ''): void {
  checks.push({ name, ok, detail });
}

function near(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

function text(selector: string): string {
  return document.querySelector(selector)?.textContent ?? '';
}

/** Waits for real time, so that the page's own loop (gsap's ticker) runs. The harness adds no frame loop of its own. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Scrolls to target and waits until the position has stopped moving, then gives the page a few frames to act on it.
 * Lenis moves the scroll position over several frames, so the wait ends only when two reads in a row agree.
 */
async function settleScroll(target: number): Promise<void> {
  window.scrollTo(0, target);
  let last = Number.NaN;
  for (let i = 0; i < 80; i += 1) {
    await wait(40);
    const now = window.scrollY;
    if (now === last && Math.abs(now - target) < 2) break;
    last = now;
  }
  await wait(160);
}

/**
 * D25.3. The layer is off once the next section's top is above the dimension line, and the "17" label is hidden once that
 * top is above the label's bottom. The next section here is the spacer after the speed section, so the test scrolls the
 * spacer's top to 40 px above the line, to 40 px below it, and to 10 px below it (inside the label).
 */
async function boundaryChecks(): Promise<void> {
  const speed = document.getElementById('speed');
  const line = document.querySelector<SVGLineElement>('.speed-dim__line');
  const label = document.querySelector<HTMLElement>('.speed-dim-label');
  const art = document.querySelector<HTMLElement>('.speed-art');
  const below = speed?.nextElementSibling;
  if (speed === null || line === null || label === null || art === null || !(below instanceof HTMLElement)) {
    check('boundary checks: markup present', false);
    return;
  }
  const size = viewportSize();
  const landscape = size.width >= size.height;
  // The line's reach in portrait is its lower end, which is where the label sits.
  const reference = Number(landscape ? line.getAttribute('y1') : line.getAttribute('y2'));
  const belowDoc = below.getBoundingClientRect().top + window.scrollY;

  const at = async (gap: number): Promise<{ on: boolean; hidden: boolean; top: number }> => {
    await settleScroll(belowDoc - gap);
    return {
      on: art.classList.contains('is-on'),
      hidden: label.style.visibility === 'hidden',
      top: below.getBoundingClientRect().top,
    };
  };
  const above = await at(reference - 40);
  const beside = await at(reference + 40);
  const inLabel = await at(reference + 10);
  check(
    'layer off once the next top is above the dimension line (D25.3)',
    above.on === false,
    `next top ${above.top.toFixed(2)} line ${reference.toFixed(2)} on ${String(above.on)}`,
  );
  check(
    'layer on while the next top is below the dimension line',
    beside.on === true,
    `next top ${beside.top.toFixed(2)} line ${reference.toFixed(2)} on ${String(beside.on)}`,
  );
  check(
    'label hidden while the next top is inside the label (D25.3)',
    inLabel.hidden === true && inLabel.on === true,
    `next top ${inLabel.top.toFixed(2)} hidden ${String(inLabel.hidden)} on ${String(inLabel.on)}`,
  );
  check(
    'label shown again once the next top clears the label',
    beside.hidden === false,
    `next top ${beside.top.toFixed(2)} hidden ${String(beside.hidden)}`,
  );
  window.scrollTo(0, 0);
}

async function runChecks(): Promise<void> {
  const el = document.getElementById('speed');
  if (el === null) {
    check('section#speed present', false, 'no element with id speed');
    return;
  }
  const h2 = el.querySelector('h2');
  check('one h2, id speed-title, labelled by it', h2 !== null && h2.id === 'speed-title' && el.getAttribute('aria-labelledby') === 'speed-title');
  check('h2 aria-label is Fastest', h2?.getAttribute('aria-label') === COPY.title, String(h2?.getAttribute('aria-label')));
  check('section theme and act', el.dataset.theme === 'paper' && el.dataset.act === '1');
  check('section cursor form marked caliper', el.dataset.cursor === 'caliper');
  // D23.1: the title group, the notes and the example panel are the theme blocks, and no colour is written inline, so
  // every colour comes from a token that [data-theme] redefines.
  const themeBlocks = Array.from(el.querySelectorAll<HTMLElement>('[data-theme-block]'));
  check(
    'three theme blocks: title group, notes, example panel (D23.1)',
    themeBlocks.length === 3 &&
      themeBlocks[0].classList.contains('speed-title-group') &&
      themeBlocks[1].classList.contains('speed-notes') &&
      themeBlocks[2].classList.contains('speed-panel'),
    themeBlocks.map((b) => b.className).join(' | '),
  );
  check(
    'no inline colour in the section (tokens only, D23.1)',
    Array.from(el.querySelectorAll<HTMLElement>('*')).every((n) => n.style.color === ''),
  );
  check('kicker copy', text('.speed-kicker') === COPY.kicker);
  check('title text', text('.speed-title__text') === COPY.title);
  check('source note copy verbatim', text('.speed-source') === COPY.source, text('.speed-source'));
  check('footnote copy verbatim', text('.speed-footnote') === COPY.footnote, text('.speed-footnote'));
  check('support copy verbatim', text('.speed-support') === COPY.support, text('.speed-support'));
  check('panel label copy', text('.speed-panel__label') === COPY.label);
  check('panel prompt copy', text('.speed-panel__prompt') === COPY.prompt);
  const tokens = Array.from(el.querySelectorAll<HTMLElement>('.speed-tok'));
  const streamText = tokens.map((t) => t.textContent ?? '').join('').replace(/\u00a0/g, ' ').trim();
  check('stream is 40 tokens', tokens.length === STREAM_TOKENS, `count ${tokens.length}`);
  check('stream copy verbatim', streamText === COPY.stream, streamText);
  check('stream is at most 240 characters with spaces', COPY.stream.length <= 240, `length ${COPY.stream.length}`);
  check('figcaption carries the race text', text('.speed-race figcaption') === COPY.race);
  check('art is decorative', el.querySelector('.speed-art')?.getAttribute('aria-hidden') === 'true');
  const ids = Array.from(document.querySelectorAll('[id]')).map((n) => n.id);
  check('no duplicate ids', new Set(ids).size === ids.length);

  // The stream arithmetic (act I, speed, Keep-alive): the floor, the ceiling, and the offsets at the floor.
  check('rate floor at rest', streamRate(0) === 34, String(streamRate(0)));
  check('rate ceiling at 4000 px/s', streamRate(4000) === 160, String(streamRate(4000)));
  check('rate in between', near(streamRate(1500), 60, 1e-9), String(streamRate(1500)));
  const floor = streamOffsets(34);
  check('floor offsets 0, 0.1837, 0.2598, 0.3181', near(floor[1], 0.1837, 5e-4) && near(floor[2], 0.2598, 5e-4) && near(floor[3], 0.3181, 5e-4), floor.slice(0, 4).map((v) => v.toFixed(4)).join(' '));
  check('floor last offset 1.1471', near(floor[39], 1.1471, 5e-4), floor[39].toFixed(4));

  // The object layer: the fallback box is the P1 rectangle of the race at the speed keyframe (rule A6).
  const size = viewportSize();
  const rects = formationRects('race', 'speed', size);
  const box = boundsOf(rects, 0, 16);
  const landscape = size.width >= size.height;
  const fallback = landscape ? document.querySelector<HTMLElement>('.speed-fallback--row') : document.querySelector<HTMLElement>('.speed-fallback--col');
  if (fallback !== null) {
    const left = parseFloat(fallback.style.left);
    const top = parseFloat(fallback.style.top);
    const width = parseFloat(fallback.style.width);
    const height = parseFloat(fallback.style.height);
    check(
      'fallback box is the race P1 rectangle',
      near(left, box.x0, 0.01) && near(top, box.y0, 0.01) && near(width, box.x1 - box.x0, 0.01) && near(height, box.y1 - box.y0, 0.01),
      `left ${left.toFixed(2)} top ${top.toFixed(2)} w ${width.toFixed(2)} h ${height.toFixed(2)}`,
    );
  }
  const line = el.querySelector<SVGLineElement>('.speed-dim__line');
  check('dimension line exists', line !== null);
  if (landscape) {
    check('race block 01 left edge is 139.8 px at 1440 by 900', size.width !== 1440 || near(rects[0].x0, 139.8, 0.1), rects[0].x0.toFixed(2));
  }
  // Layout placed the dimension line below the race in landscape, and beside it in portrait.
  if (line !== null) {
    const y1 = parseFloat(line.getAttribute('y1') ?? 'NaN');
    const x1 = parseFloat(line.getAttribute('x1') ?? 'NaN');
    check(
      'dimension line starts at block 01 (landscape: 19 px below the race; portrait: 19 px beside it)',
      landscape ? near(x1, rects[0].x0, 0.01) && near(y1, box.y1 + 19, 0.01) : near(x1, box.x1 + 19, 0.01) && near(y1, rects[0].y0, 0.01),
      `x1 ${x1.toFixed(2)} y1 ${y1.toFixed(2)}`,
    );
  }

  // Portrait (D21.2): the head and the example panel share the left band, from the margin to 12 px left of the race
  // column's rest footprint, and the "17" label stays inside the viewport beneath the line's end.
  if (!landscape) {
    const head = el.querySelector<HTMLElement>('.speed-head');
    const panel = el.querySelector<HTMLElement>('.speed-panel');
    const label = el.querySelector<HTMLElement>('.speed-dim-label');
    const bandRight = box.x0 - 12;
    if (head !== null && panel !== null) {
      const headRect = head.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      check(
        'portrait head ends 12 px left of the race column',
        near(headRect.right, bandRight, 0.5),
        `head right ${headRect.right.toFixed(2)} band right ${bandRight.toFixed(2)}`,
      );
      check(
        'portrait example panel is the head band',
        near(panelRect.right, bandRight, 0.5) && near(panelRect.width, headRect.width, 0.5),
        `panel right ${panelRect.right.toFixed(2)} width ${panelRect.width.toFixed(2)}`,
      );
    }
    if (label !== null) {
      const labelRect = label.getBoundingClientRect();
      check('portrait "17" label stays inside the viewport', labelRect.right <= size.width, `label right ${labelRect.right.toFixed(2)}`);
    }
  }

  await boundaryChecks();
  const failed = checks.filter((c) => !c.ok).map((c) => c.name);
  (window as unknown as { __speedChecks: Check[] }).__speedChecks = checks;
  root.dataset.harnessChecks = JSON.stringify(checks);
  root.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join(',')}`;
}

registerEases();
initTicker();
initScroll();
initHover();
const speed = document.getElementById('speed');
if (speed === null) {
  root.dataset.harness = 'fail:no-speed';
} else {
  initSpeed({ el: speed, reducedMotion: env.reducedMotion, gl: false });
  let remove: (() => void) | null = null;
  remove = addTick(() => {
    remove?.();
    bus.emit('loader:done');
    // The checks run after the first tick, when the section has placed its object layer.
    setTimeout(() => {
      void runChecks();
    }, 0);
  }, PRIORITY.state);
}

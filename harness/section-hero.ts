// Harness for the hero's 2D layer, src/sections/hero/hero.ts (architecture section 10a; direction-act1 hero).
// Open /harness/section-hero.html on the dev server, optionally with ?nogl (html.no-gl, the static stanza shows)
// or ?gl (the stanza-open annotations are placed as with WebGL; no canvas is drawn here). The page starts the
// section as the boot does, emits loader:done after the first tick, and runs the geometry checks below. The verdict
// lands in dataset.harness ('pass' or 'fail:<names>'), and the checks in window.__heroChecks.
import { bus } from '../src/core/bus';
import { env } from '../src/core/env';
import { registerEases } from '../src/core/ease';
import { initHover } from '../src/core/hover';
import { initScroll } from '../src/core/scroll';
import { addTick, initTicker, PRIORITY } from '../src/core/ticker';
import { blockRects, boundsOf, formationRects, viewportSize, type ScreenRect, type Size } from '../src/core/projection';
import { stanzaOpen, type Pose } from '../src/gl/blocks/formations';
import { cameraKey } from '../src/gl/rig';
import { initHero } from '../src/sections/hero/hero';
import { heroKey, stanzaPoses, stanzaRects } from '../src/sections/hero/stanza';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

const root = document.documentElement;
const checks: Check[] = [];
const LEDE =
  'Anthropic calls it “the cheapest, fastest, and most capable small model we’ve ever released,” designed for high-volume, cost-sensitive tasks.';

function check(name: string, ok: boolean, detail = ''): void {
  checks.push({ name, ok, detail });
}

function near(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

function rectsMatch(a: readonly ScreenRect[], b: readonly ScreenRect[], tol: number): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const p = a[i];
    const q = b[i];
    if (!(near(p.x0, q.x0, tol) && near(p.y0, q.y0, tol) && near(p.x1, q.x1, tol) && near(p.y1, q.y1, tol))) return false;
  }
  return true;
}

function posesMatch(a: readonly Pose[], b: readonly Pose[], tol: number): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      if (!near(a[i].p[c], b[i].p[c], tol)) return false;
    }
  }
  return true;
}

function runChecks(): void {
  const el = document.getElementById('hero');
  if (el === null) {
    check('section#hero present', false, 'no element with id hero');
    return;
  }
  const h1 = document.querySelector('h1');
  check(
    'one h1, id hero-title',
    document.querySelectorAll('h1').length === 1 && h1 !== null && h1.id === 'hero-title',
    h1 === null ? 'no h1' : `h1 id ${h1.id}`,
  );
  check('section labelled by hero-title', el.getAttribute('aria-labelledby') === 'hero-title');
  check('section theme and act', el.dataset.theme === 'paper' && el.dataset.act === '1');
  check('h1 text', h1?.textContent === 'ClaudeHaiku 5.5', String(h1?.textContent));
  const lede = document.querySelector('.hero-lede')?.textContent ?? '';
  check('lede copy verbatim (D16.2)', lede === LEDE, lede);
  check('kicker copy', document.querySelector('.hero-kicker')?.textContent === 'Launched October 7, 2026');
  const cta = document.querySelector<HTMLAnchorElement>('.hero-cta');
  check(
    'primary button copy and href',
    cta?.textContent === 'Haiku 5.5 docs' &&
      cta.getAttribute('href') === 'https://platform.claude.com/docs/en/models/haiku-5-5/overview',
  );
  const link = document.querySelector<HTMLAnchorElement>('.hero-link');
  check('secondary link copy and href', link?.textContent === 'See speed' && link.getAttribute('href') === '#speed');
  check(
    'figure caption (text equivalent of the object)',
    document.querySelector('#hero figcaption')?.textContent === 'Seventeen blocks set in three rows of five, seven and five.',
  );
  const counts = Array.from(document.querySelectorAll('.hero-count')).map((c) => c.textContent);
  check('row-end counts 05 07 05', counts.join(' ') === '05 05 05' || counts.join(' ') === '05 07 05', counts.join(' '));
  check('dimension label 17', document.querySelector('.hero-dim-label')?.textContent === '17');

  // The projection: the hero key is cameraKey('hero'), and the rest and open stanzas match the formations.
  const size: Size = viewportSize();
  const key = heroKey(size);
  const ref = cameraKey('hero', size);
  const keyOk =
    key.position.every((v, i) => near(v, ref.position[i], 1e-9)) &&
    key.target.every((v, i) => near(v, ref.target[i], 1e-9)) &&
    near(key.fov, ref.fov, 1e-12);
  check('hero key equals cameraKey(hero) (A7)', keyOk, `z ${key.position[2].toFixed(4)}`);

  const restMine = stanzaRects(0, size, []);
  const restRef = formationRects('stanza', 'hero', size);
  check('rest rectangles equal formationRects(stanza) (P1)', rectsMatch(restMine, restRef, 1e-7));

  let openOk = true;
  let posesOk = true;
  const detail: string[] = [];
  for (const k of [0.25, 0.5, 0.9, 1]) {
    const reference = stanzaOpen(k, []);
    const mine = stanzaPoses(k, []);
    posesOk = posesOk && posesMatch(mine, reference, 1e-12);
    const expect = blockRects(reference, ref, size, []);
    const got = stanzaRects(k, size, []);
    openOk = openOk && rectsMatch(got, expect, 1e-7);
    detail.push(`k${k}:${boundsOf(got, 0, 16).x1.toFixed(2)}`);
  }
  check('open poses equal stanzaOpen (11.11)', posesOk);
  check('open rectangles equal blockRects(stanzaOpen) (P1)', openOk, detail.join(' '));

  // The placed annotations: each row-end count sits gap px right of its row, and the 17 label is centred on the line.
  // On load the hero progress is 0, so the stanza is at its rest pose and the annotations follow it.
  const landscape = size.width >= size.height;
  const gap = landscape && size.width >= 768 ? 12 : 5;
  const rows = [boundsOf(restRef, 0, 4), boundsOf(restRef, 5, 11), boundsOf(restRef, 12, 16)];
  const countEls = Array.from(document.querySelectorAll<HTMLElement>('.hero-count'));
  for (let i = 0; i < 3; i += 1) {
    const box = countEls[i].getBoundingClientRect();
    const want = rows[i].x1 + gap;
    check(`count ${i} at row edge plus ${gap}px`, near(box.left, want, 0.6), `left ${box.left.toFixed(2)} want ${want.toFixed(2)}`);
  }
  const dimLabel = document.querySelector<HTMLElement>('.hero-dim-label');
  if (dimLabel !== null) {
    const box = dimLabel.getBoundingClientRect();
    const mid = (rows[1].x0 + rows[1].x1) / 2;
    check('17 label centred on the dimension line', near(box.left + box.width / 2, mid, 0.6), `centre ${(box.left + box.width / 2).toFixed(2)} want ${mid.toFixed(2)}`);
    const below = rows[2].y1 + 19 + 5;
    check('17 label 5px below the line, 19px below row C', near(box.top, below, 0.6), `top ${box.top.toFixed(2)} want ${below.toFixed(2)}`);
  }

  // The section is 200 svh, the scroll length the choreography reads (rule A3). Phone landscape is the exception: its
  // copy is not pinned, so the section is as tall as its stage (direction-act1 hero, phone landscape).
  const sectionHeight = el.getBoundingClientRect().height;
  const phoneLandscape = window.innerWidth < 768 && window.innerWidth >= window.innerHeight;
  const stageHeight = document.querySelector<HTMLElement>('#hero .hero-stage')?.getBoundingClientRect().height ?? 0;
  if (phoneLandscape) {
    check('section height is its stage (phone landscape)', near(sectionHeight, stageHeight, 1), `height ${sectionHeight.toFixed(1)}`);
  } else {
    check('section height is 2 vh', near(sectionHeight, 2 * window.innerHeight, 1), `height ${sectionHeight.toFixed(1)}`);
  }

  // The fallback box is the rest stanza (P1), and it is set on the element that the no-WebGL class shows.
  const fallback = document.querySelector<HTMLElement>('.hero-fallback');
  const box = boundsOf(restRef, 0, 16);
  if (fallback !== null) {
    const left = parseFloat(fallback.style.left);
    const width = parseFloat(fallback.style.width);
    check(
      'fallback box is the rest stanza',
      near(left, box.x0, 0.01) && near(width, box.x1 - box.x0, 0.01),
      `left ${left.toFixed(2)} width ${width.toFixed(2)}`,
    );
  }
}

const params = new URLSearchParams(location.search);
const gl = params.has('gl');

registerEases();
initTicker();
initScroll();
initHover();
const hero = document.getElementById('hero');
if (hero === null) {
  root.dataset.harness = 'fail:no-hero';
} else {
  initHero({ el: hero, reducedMotion: env.reducedMotion, gl });
  let remove: (() => void) | null = null;
  remove = addTick(() => {
    remove?.();
    bus.emit('loader:done');
    // Checks run after the first tick, when the section has placed its object layer.
    setTimeout(() => {
      runChecks();
      const failed = checks.filter((c) => !c.ok).map((c) => c.name);
      (window as unknown as { __heroChecks: Check[] }).__heroChecks = checks;
      root.dataset.harnessChecks = JSON.stringify(checks);
      root.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join(',')}`;
    }, 0);
  }, PRIORITY.state);
}

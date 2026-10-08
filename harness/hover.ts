// Harness for src/core/hover.ts (architecture section 10a). Open /harness/hover.html on the dev server.
// The verdict lands in dataset.harness: "pass", or "fail:" followed by the failed step ids.
//
// Every check reads the DOM after real input. Each step pauses: the page sets dataset.harnessStep to the
// step id and dataset.harnessWait to the step index, then waits until the driver sets dataset.harnessGo to
// that index. The driver (hover-drive.mjs in the session scratchpad) performs the input the id names:
// a mouse or pen approach from the left or right, a move inside an element, a Tab key press, or a touch tap.
import { initHover } from '../src/core/hover';

const ATTR = 'data-enter';
const root = document.documentElement;

type Kind = 'mouse' | 'pen' | 'touch';

interface Check {
  el: Element;
  value: string | null;
}

interface Step {
  /** kind:target:side. The driver parses it. */
  id: string;
  /** The pointerType of the last pointerover in this step. */
  type?: Kind;
  /** data-enter is removed from these before the step waits. */
  reset?: Element[];
  /** Page-side setup, run before the step waits. */
  prepare?: () => void;
  /** Keyboard steps: the element that must hold focus afterwards. */
  focus?: Element;
  checks: Check[];
}

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`missing #${id}`);
  return el;
}

function describe(el: Element | null): string {
  if (el === null) return 'nothing';
  return el.id === '' ? el.tagName.toLowerCase() : `#${el.id}`;
}

const failed: string[] = [];
let passed = 0;
let lastPointerType = 'none';

// Harness-only observer of the input kind. The driver checks it, so a pen step proves a pen event arrived.
document.addEventListener(
  'pointerover',
  (e: PointerEvent) => {
    lastPointerType = e.pointerType;
  },
  { passive: true },
);

let cleanup = initHover();

const l1 = byId('l1');
const l2 = byId('l2');
const l3 = byId('l3');
const b1 = byId('b1');
const r1 = byId('r1');
const rl1 = byId('rl1');

const steps: Step[] = [
  // Mouse enters, from the left and from the right, on each element.
  { id: 'mouse:l1:left', type: 'mouse', reset: [l1], checks: [{ el: l1, value: 'left' }] },
  // A move inside the element does not recompute the side (no per-move work).
  { id: 'within:l1:right', checks: [{ el: l1, value: 'left' }] },
  { id: 'mouse:l1:right', type: 'mouse', reset: [l1], checks: [{ el: l1, value: 'right' }] },
  { id: 'mouse:l2:left', type: 'mouse', reset: [l2], checks: [{ el: l2, value: 'left' }] },
  { id: 'mouse:l2:right', type: 'mouse', reset: [l2], checks: [{ el: l2, value: 'right' }] },
  { id: 'mouse:l3:left', type: 'mouse', reset: [l3], checks: [{ el: l3, value: 'left' }] },
  { id: 'mouse:l3:right', type: 'mouse', reset: [l3], checks: [{ el: l3, value: 'right' }] },
  { id: 'mouse:b1:left', type: 'mouse', reset: [b1], checks: [{ el: b1, value: 'left' }] },
  { id: 'mouse:b1:right', type: 'mouse', reset: [b1], checks: [{ el: b1, value: 'right' }] },
  // A pen counts as a pointer with a side.
  { id: 'pen:l2:left', type: 'pen', reset: [l2], checks: [{ el: l2, value: 'left' }] },
  // A link inside a data-hover row: entering through the link gives both elements a side.
  {
    id: 'mouse:rl1:left',
    type: 'mouse',
    reset: [rl1, r1],
    checks: [
      { el: rl1, value: 'left' },
      { el: r1, value: 'left' },
    ],
  },
  // Entering the row through its right-hand cell gives the row the right side.
  { id: 'mouse:rc2:right', type: 'mouse', reset: [r1], checks: [{ el: r1, value: 'right' }] },
  // Keyboard focus (:focus-visible) sets left. Tab order: l1, l2, l3, b1.
  { id: 'key:l1', reset: [l1], focus: l1, checks: [{ el: l1, value: 'left' }] },
  { id: 'key:l2', reset: [l2], focus: l2, checks: [{ el: l2, value: 'left' }] },
  { id: 'key:l3', reset: [l3], focus: l3, checks: [{ el: l3, value: 'left' }] },
  { id: 'key:b1', reset: [b1], focus: b1, checks: [{ el: b1, value: 'left' }] },
  // After cleanup the listeners are gone: a mouse enter sets nothing.
  {
    id: 'mouse:l3:left',
    type: 'mouse',
    reset: [l3],
    prepare: () => {
      cleanup();
    },
    checks: [{ el: l3, value: null }],
  },
  // After a fresh init the listeners work again.
  {
    id: 'mouse:l3:right',
    type: 'mouse',
    reset: [l3],
    prepare: () => {
      cleanup = initHover();
    },
    checks: [{ el: l3, value: 'right' }],
  },
  // Touch: no side is written. A stale mouse side from before the tap is removed (centre origin).
  { id: 'tap:b1', type: 'touch', reset: [b1], checks: [{ el: b1, value: null }] },
  { id: 'tap:l3', type: 'touch', checks: [{ el: l3, value: null }] },
];

function waitForGo(index: number, id: string): Promise<void> {
  root.dataset.harnessStep = id;
  root.dataset.harnessWait = String(index);
  return new Promise<void>((resolve) => {
    const poll = (): void => {
      if (root.dataset.harnessGo === String(index)) resolve();
      else window.setTimeout(poll, 4);
    };
    poll();
  });
}

function record(step: Step): void {
  const problems: string[] = [];
  for (const c of step.checks) {
    const got = c.el.getAttribute(ATTR);
    if (got !== c.value) {
      problems.push(`${describe(c.el)} ${ATTR}=${got ?? 'absent'}, want ${c.value ?? 'absent'}`);
    }
  }
  if (step.type !== undefined && lastPointerType !== step.type) {
    problems.push(`last pointerover ${lastPointerType}, want ${step.type}`);
  }
  if (step.focus !== undefined && document.activeElement !== step.focus) {
    problems.push(`focus on ${describe(document.activeElement)}`);
  }
  if (problems.length === 0) {
    passed += 1;
    console.log(`PASS ${step.id}`);
  } else {
    failed.push(step.id);
    console.log(`FAIL ${step.id} :: ${problems.join('; ')}`);
  }
}

async function run(): Promise<void> {
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    for (const node of step.reset ?? []) node.removeAttribute(ATTR);
    step.prepare?.();
    lastPointerType = 'none';
    await waitForGo(i, step.id);
    record(step);
  }
}

run().then(
  () => {
    root.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join(' ')}`;
    console.log(`${passed} passed, ${failed.length} failed`);
  },
  (err: unknown) => {
    root.dataset.harness = `fail:exception ${String(err)}`;
  },
);

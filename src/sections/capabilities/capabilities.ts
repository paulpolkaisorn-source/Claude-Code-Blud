// The capabilities section's 2D layer (design/direction-act2.md, capabilities; decisions D6, D16.3, D17.1 and D20).
//
// Progress. p is the centre-line progress of rule C2: p = (0.5 x vh - top) / H, so p is 0 when the section top is at the
// centre of the viewport. Card k (0 to 2) is active while p is in [k / 3, (k + 1) / 3), which is the card whose slot
// centre is nearest the viewport centre. The stair follows p.
//
// Activation. A tap or key (arrows, Home, End, Enter, Space) makes the card active at once, announces it with
// hk:cap-active, and moves the page to its slot with scrollToTarget. The active card is held until the page has
// landed on its slot, or until the reader's next wheel, touch or key input (the 3D layer holds on the same rule).
//
// Events. hk:cap-active { index, source } on a tap or key activation that changes the card; hk:cap-hover { index } on a
// card's pointer enter (index null on leave) with a fine pointer. The section imports nothing from src/gl.
import './capabilities.css';
import type { SectionContext } from '../../main';
import { bus } from '../../core/bus';
import { env, onReducedMotionChange } from '../../core/env';
import { scrollToTarget } from '../../core/scroll';
import { PRIORITY, addTick } from '../../core/ticker';
import { applyStair, createCap0, createCap1, stairStep } from './cap-graphics';
import { applyStage } from './cap-layout';
import { createTitleReveal } from './cap-title';

/** The document events of the 3D layer (src/sections/capabilities/gl.ts). */
const ACTIVATE_EVENT = 'hk:cap-active';
const HOVER_EVENT = 'hk:cap-hover';

const CARD_COUNT = 3;

/** Keys that navigate the cards or press the focused card. They do not end a hold, because they are the activation. */
const CARD_KEYS: ReadonlySet<string> = new Set(['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' ']);

type Source = 'key' | 'tap';

function clampIndex(index: number): number {
  return Math.min(CARD_COUNT - 1, Math.max(0, index));
}

/** The card a key moves to from card index, or null for a key that does not move between cards. */
function targetFor(index: number, key: string): number | null {
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return clampIndex(index + 1);
    case 'ArrowUp':
    case 'ArrowLeft':
      return clampIndex(index - 1);
    case 'Home':
      return 0;
    case 'End':
      return CARD_COUNT - 1;
    default:
      return null;
  }
}

export function initCapabilities(ctx: SectionContext): void {
  const section = ctx.el;
  const title = section.querySelector<HTMLElement>('.cap__title');
  const cards = Array.from(section.querySelectorAll<HTMLElement>('.cap-card'));
  const slots = Array.from(section.querySelectorAll<HTMLElement>('.cap-slot'));
  const svg0 = section.querySelector<SVGSVGElement>('.cap-art--0 svg');
  const svg1 = section.querySelector<SVGSVGElement>('.cap-art--1 svg');
  const stairSquares = Array.from(section.querySelectorAll<SVGRectElement>('.cap2__step'));
  const stairLabels = Array.from(section.querySelectorAll<HTMLElement>('.cap2__label'));

  // The markup is the contract: one slot, one card and one heading button for each capability.
  const buttons: HTMLButtonElement[] = [];
  for (const card of cards) {
    const button = card.querySelector<HTMLButtonElement>('.cap-card__button');
    if (button === null) return;
    buttons.push(button);
  }
  if (title === null || cards.length !== CARD_COUNT || slots.length !== CARD_COUNT || svg0 === null || svg1 === null) {
    return;
  }

  let reduced = ctx.reducedMotion;
  let active = 0;
  let held: number | null = null;
  let inView = false;
  // Card 0 is active when the page loads. Its sequence plays once the section is in view.
  let cap0Pending = true;
  let lastStep = -1;

  const cap0 = createCap0(svg0);
  const cap1 = createCap1(svg1);
  const titleReveal = createTitleReveal(title, section);

  const dispatch = (name: string, detail: Record<string, unknown>): void => {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  };

  /** The card states that follow the active index: the pressed state, the roving tab stop and the card class. */
  const showActive = (): void => {
    cards.forEach((card, i) => {
      const on = i === active;
      card.classList.toggle('is-active', on);
      buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      buttons[i].tabIndex = on ? 0 : -1;
    });
  };

  /** Card 0's sequence plays from its first frame when card 0 becomes active while the section is in view. */
  const startCap0 = (): void => {
    if (reduced) {
      cap0.finish();
      return;
    }
    if (inView) {
      cap0.play();
      cap0Pending = false;
    } else {
      cap0Pending = true;
    }
  };

  const setActive = (index: number): void => {
    if (index === active) return;
    active = index;
    showActive();
    if (index === 0) startCap0();
  };

  /** Once per frame while the section is in view: the progress, the held card and the stair. */
  const frame = (): void => {
    if (!inView) return;
    const rect = section.getBoundingClientRect();
    if (rect.height <= 0) return;
    const p = (window.innerHeight / 2 - rect.top) / rect.height;
    const nearest = clampIndex(Math.floor(p * CARD_COUNT));
    if (held !== null && nearest === held) held = null;
    setActive(held ?? nearest);
    const step = reduced ? 1 : stairStep(p);
    if (step !== lastStep) {
      lastStep = step;
      applyStair(step, stairSquares, stairLabels);
    }
  };

  /** A tap or key activation: hold the card, announce it, and move the page to its slot with its heading focused. */
  const activate = (index: number, source: Source): void => {
    held = index;
    if (index !== active) {
      setActive(index);
      dispatch(ACTIVATE_EVENT, { index, source });
    }
    const button = buttons[index];
    const offset = slots[index].getBoundingClientRect().top - button.getBoundingClientRect().top;
    scrollToTarget(button, { offset });
  };

  // ---------- Activation and keyboard ----------

  cards.forEach((card, i) => {
    card.addEventListener('click', (event) => {
      // A tap on the graphic does nothing (C11 of act II, Touch). A tap anywhere else on the card activates it.
      if (event.target instanceof Element && event.target.closest('.cap-art') !== null) return;
      activate(i, event.detail === 0 ? 'key' : 'tap');
    });
    card.addEventListener('pointerenter', (event) => {
      if (!env.finePointer || event.pointerType === 'touch') return;
      dispatch(HOVER_EVENT, { index: i });
    });
    card.addEventListener('pointerleave', (event) => {
      if (!env.finePointer || event.pointerType === 'touch') return;
      dispatch(HOVER_EVENT, { index: null });
    });
  });

  buttons.forEach((button, i) => {
    button.addEventListener('keydown', (event) => {
      const target = targetFor(i, event.key);
      if (target === null) return;
      const atEdge = target === i;
      // At the first or last card an arrow keeps its page scroll. Home and End always land on a card.
      if (atEdge && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      if (!atEdge) buttons[target].focus({ preventScroll: true });
      activate(target, 'key');
    });
  });

  // Input ends a hold. A key that is part of card navigation does not, since it is the activation itself.
  const release = (): void => {
    held = null;
  };
  window.addEventListener('wheel', release, { passive: true });
  window.addEventListener('touchstart', release, { passive: true });
  window.addEventListener('keydown', (event) => {
    const onCard = event.target instanceof HTMLButtonElement && buttons.includes(event.target);
    if (onCard && CARD_KEYS.has(event.key)) return;
    release();
  });

  // ---------- Viewport, visibility and motion ----------

  const io = new IntersectionObserver((entries) => {
    inView = entries.some((entry) => entry.isIntersecting);
    cap1.setRunning(inView && !reduced);
    if (inView && cap0Pending && active === 0 && !reduced) {
      cap0.play();
      cap0Pending = false;
    }
    frame();
  });
  io.observe(section);

  const layout = (): void => {
    applyStage(section);
  };
  layout();
  window.addEventListener('resize', layout, { passive: true });
  bus.once('loader:done', layout);
  void document.fonts.ready.then(layout);

  /** Applies the motion state: reduced motion sets every graphic to its final or static state. */
  const applyMotion = (): void => {
    if (reduced) {
      cap0.finish();
      cap1.setStatic();
      titleReveal.unmount();
      cap0Pending = false;
    } else {
      cap1.setAnimated();
      titleReveal.mount();
      cap0.reset();
      if (active === 0) startCap0();
    }
    cap1.setRunning(inView && !reduced);
    lastStep = -1;
    frame();
  };

  showActive();
  applyStair(reduced ? 1 : 0, stairSquares, stairLabels);
  lastStep = reduced ? 1 : 0;
  applyMotion();
  onReducedMotionChange((value) => {
    reduced = value;
    applyMotion();
  });

  addTick(frame, PRIORITY.state);
}

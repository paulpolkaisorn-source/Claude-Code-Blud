// Direction-aware hover (direction.md heading 13, decision D2.1).
//
// initHover() adds two delegated, passive listeners on document. They write one attribute, data-enter,
// on the hover elements inside the root. base.css reads it to set the transform-origin of each hover
// pseudo-element, so the hover line draws from the side the pointer came in from. This file has no styles.
//
// Attribute contract:
//   data-enter="left"   the pointer entered from the left half of the element, or keyboard focus took it.
//                       The pseudo-element scales from the left edge.
//   data-enter="right"  the pointer entered from the right half. The pseudo-element scales from the right edge.
//   no data-enter       touch, or never entered. CSS uses the centre origin.
//
// Hover elements: [data-hover], a[href], button, .btn and tr[data-hover].
//
// Enter: a pointerover whose relatedTarget is outside the element, or null. Every hover element the pointer
// enters is updated, so a table row and a link inside it both get a side.
//   - mouse or pen: the side is event.clientX against the element's horizontal centre. The rectangle is
//     read once per enter. Pointer moves do no work.
//   - touch: data-enter is removed, so touch uses the centre origin even after an earlier mouse enter.
// Keyboard: focusin on an element that matches :focus-visible sets "left" on it and on each hover element
// around it, the same as an enter.
// Leave: data-enter stays, so the line retracts toward the side it entered from.

type Side = 'left' | 'right';

const ATTR = 'data-enter';
const HOVER_SELECTOR = '[data-hover], a[href], button, .btn, tr[data-hover]';

/** The side of the element's horizontal centre that the pointer entered from. Reads the rectangle only. */
function sideFor(el: Element, clientX: number): Side {
  const rect = el.getBoundingClientRect();
  return clientX < rect.left + rect.width / 2 ? 'left' : 'right';
}

/** :focus-visible, read defensively: a browser without it gives keyboard focus no side. */
function isFocusVisible(el: Element): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return false;
  }
}

function onPointerOver(root: ParentNode, e: PointerEvent): void {
  const target = e.target;
  if (!(target instanceof Element) || !root.contains(target)) return;

  const from = e.relatedTarget;
  const entered: Element[] = [];
  for (let el: Element | null = target; el !== null && el !== root; el = el.parentElement) {
    // If the pointer came from inside this element, it came from inside every ancestor too.
    if (from instanceof Node && el.contains(from)) break;
    if (el.matches(HOVER_SELECTOR)) entered.push(el);
  }
  if (entered.length === 0) return;

  if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
    // Read every rectangle before the first write, so no write is followed by a forced layout.
    const sides = entered.map((el) => sideFor(el, e.clientX));
    entered.forEach((el, i) => el.setAttribute(ATTR, sides[i]));
  } else {
    entered.forEach((el) => el.removeAttribute(ATTR));
  }
}

function onFocusIn(root: ParentNode, e: FocusEvent): void {
  const target = e.target;
  if (!(target instanceof Element) || !root.contains(target) || !isFocusVisible(target)) return;
  for (let el: Element | null = target; el !== null && el !== root; el = el.parentElement) {
    if (el.matches(HOVER_SELECTOR)) el.setAttribute(ATTR, 'left');
  }
}

/**
 * Starts direction-aware hover for the elements inside root (default: the whole document).
 * Returns a cleanup function that removes both listeners. It leaves data-enter values in place.
 */
export function initHover(root: ParentNode = document): () => void {
  const over = (e: PointerEvent): void => onPointerOver(root, e);
  const focus = (e: FocusEvent): void => onFocusIn(root, e);
  document.addEventListener('pointerover', over, { passive: true });
  document.addEventListener('focusin', focus, { passive: true });
  return (): void => {
    document.removeEventListener('pointerover', over);
    document.removeEventListener('focusin', focus);
  };
}

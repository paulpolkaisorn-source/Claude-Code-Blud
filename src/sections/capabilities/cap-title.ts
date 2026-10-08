// The capabilities title reveal (design/direction.md heading 8, rule 15; decision D2.3; direction-act2 C8).
//
// The display-xl title is split into lines and characters with SplitText. Its parent keeps the full title as its
// accessible name, and the characters are hidden from assistive technology. Once, when the title's top crosses 80 per
// cent of the viewport height, each character starts displaced away from its line centre by (i - centre) x 0.06em and
// in text-3. It settles to its set place and token colour with settle over T.beat7, and each line is staggered with
// the front profile over T.half. Lines of fewer than five characters start together. Opacity never changes. Under
// reduced motion the title is static: no split, no trigger.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { E } from '../../core/ease';
import { T, weightedStagger } from '../../core/timing';

const REVEAL_START = 'top 80%';
const DISPLACE_EM = 0.06;
const STAGGER_MIN_CHARS = 5;

export interface TitleReveal {
  /** Splits the title and arms the reveal. Does nothing under reduced motion or after the reveal has played. */
  mount(): void;
  /** Removes the split and the trigger, and leaves the title as plain text. */
  unmount(): void;
}

/** Builds the reveal for one title. The section is used for the token colour of text-3. */
export function createTitleReveal(title: HTMLElement, section: HTMLElement): TitleReveal {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  let split: SplitText | null = null;
  let reveal: gsap.core.Timeline | null = null;
  let trigger: ScrollTrigger | null = null;
  let revealed = false;

  /**
   * One paused timeline for the current split. Each character starts displaced and in text-3, and settles to its place
   * and token colour. The pre-reveal state is set here. Opacity is not touched.
   */
  const buildReveal = (lines: readonly Element[]): gsap.core.Timeline => {
    const ink = getComputedStyle(title).color;
    const grey = getComputedStyle(section).getPropertyValue('--text-3').trim();
    const timeline = gsap.timeline({ paused: true });
    for (const line of lines) {
      const chars = Array.from(line.querySelectorAll<HTMLElement>('.cap__char'));
      const n = chars.length;
      const offsets = n < STAGGER_MIN_CHARS ? chars.map(() => 0) : weightedStagger(n, { total: T.half, weight: 'front' });
      const centre = (n - 1) / 2;
      chars.forEach((char, i) => {
        const em = parseFloat(getComputedStyle(char).fontSize);
        gsap.set(char, { x: (i - centre) * DISPLACE_EM * em, color: grey });
        timeline.to(char, { x: 0, color: ink, duration: T.beat7, ease: E.settle, clearProps: 'transform,color' }, offsets[i]);
      });
    }
    return timeline;
  };

  const splitTitle = (): void => {
    if (split !== null || revealed) return;
    split = SplitText.create(title, {
      type: 'lines,chars',
      tag: 'span',
      linesClass: 'cap__line',
      charsClass: 'cap__char',
      autoSplit: true,
      onSplit: (self: SplitText) => {
        // The parent carries the full title as its name, and SplitText hides the characters from assistive technology.
        title.setAttribute('aria-label', (title.textContent ?? '').replace(/ /g, ' ').trim());
        reveal?.kill();
        reveal = buildReveal(self.lines);
      },
    });
  };

  /** After the reveal the split is removed, so the title is plain text again and no state is left behind. */
  const settleTitle = (): void => {
    split?.kill();
    split?.revert();
    split = null;
    reveal = null;
    title.removeAttribute('aria-label');
  };

  const playReveal = (): void => {
    if (revealed || reveal === null) return;
    revealed = true;
    reveal.eventCallback('onComplete', settleTitle);
    reveal.play();
  };

  const armReveal = (): void => {
    if (trigger !== null) return;
    trigger = ScrollTrigger.create({
      trigger: title,
      start: REVEAL_START,
      once: true,
      onEnter: playReveal,
    });
  };

  return {
    mount(): void {
      if (revealed) return;
      splitTitle();
      armReveal();
    },
    unmount(): void {
      if (revealed) return;
      trigger?.kill();
      trigger = null;
      reveal?.kill();
      reveal = null;
      if (split !== null) {
        split.kill();
        split.revert();
        split = null;
      }
    },
  };
}

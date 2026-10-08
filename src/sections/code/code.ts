// The code section's 2D layer (design/direction-act2.md, code; design/drafts/director-decisions.md D16.1, D18 and
// D20.3; design/direction.md headings 8, 9 and 13).
//
// This file owns the title reveal (SplitText, once, when the title top crosses 80 per cent of the viewport height),
// the colour settle of the kicker and the intro with it, the scroll-driven colour stream of the EXAMPLE OUTPUT block,
// the live line marker over both code blocks, the copy button and the character split of the response. The code
// lines do not move. Section progress p (C2) comes from one ScrollTrigger, from the section's centre to its bottom edge.
//
// The section imports nothing from src/gl. Its 3D layer is src/sections/code/gl.ts, which the choreography drives from
// the same progress. The two layers share no state, so the section works without WebGL.
import './code.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { SectionContext } from '../../main';
import { bus } from '../../core/bus';
import { E } from '../../core/ease';
import { onReducedMotionChange } from '../../core/env';
import { T, weightedStagger } from '../../core/timing';

/** The response stream runs over section progress 0.25 to 0.75 (C2 and the Sequence of direction-act2, code). */
const STREAM_FROM = 0.25;
const STREAM_SPAN = 0.5;
/** The title reveals once, when its top crosses this line (direction.md heading 8, rule 5 and rule 15). */
const REVEAL_START = 'top 80%';
/** Each character starts displaced by (i - centre) times this many em (direction.md heading 8, rule 15). */
const DISPLACE_EM = 0.06;
/** A line of fewer characters than this starts all of its characters together (rule 15). */
const STAGGER_MIN_CHARS = 5;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function initCode(ctx: SectionContext): void {
  const section = ctx.el;
  const kicker = section.querySelector<HTMLElement>('.code__kicker');
  const title = section.querySelector<HTMLElement>('.code__title');
  const intro = section.querySelector<HTMLElement>('.code__intro');
  const panel = section.querySelector<HTMLElement>('.code__panel');
  const requestCode = section.querySelector<HTMLElement>('.code__code--request');
  const responseCode = section.querySelector<HTMLElement>('.code__code--response');
  const marker = section.querySelector<HTMLElement>('.code__marker');
  const copy = section.querySelector<HTMLButtonElement>('.code__copy');
  if (!kicker || !title || !intro || !panel || !requestCode || !responseCode || !marker || !copy) return;

  gsap.registerPlugin(ScrollTrigger, SplitText);

  let reduced = ctx.reducedMotion;

  // ---------- Lines and the response characters ----------

  const requestLines = Array.from(requestCode.querySelectorAll<HTMLElement>('.code__line'));
  const responseLines = Array.from(responseCode.querySelectorAll<HTMLElement>('.code__line'));
  // The marker walks both blocks as one list of lines: the request first, then the response.
  const allLines = [...requestLines, ...responseLines];
  const lineCount = allLines.length;

  // Each response character becomes a span, so its colour can change on its own. The text is unchanged.
  const chars: HTMLElement[] = [];
  for (const line of responseLines) {
    const text = line.textContent ?? '';
    line.textContent = '';
    for (const ch of text) {
      const span = document.createElement('span');
      span.className = 'code__char';
      span.textContent = ch;
      line.append(span);
      chars.push(span);
    }
  }
  const charCount = chars.length;

  let litCount = 0;
  let markerIndex = 0;
  let lineTops: number[] = [];

  /** Lights the first count characters of the response and darkens the rest. Only the characters that change are touched. */
  const setLit = (count: number): void => {
    const next = Math.min(charCount, Math.max(0, count));
    for (let j = litCount; j < next; j += 1) chars[j].classList.add('is-lit');
    for (let j = next; j < litCount; j += 1) chars[j].classList.remove('is-lit');
    litCount = next;
  };

  /** Moves the live marker to a line. Animated, it jumps with cut over T.micro. Reduced, it is set at once. */
  const placeMarker = (index: number, animate: boolean): void => {
    const top = lineTops[index];
    if (top === undefined) return;
    gsap.killTweensOf(marker);
    if (animate && !reduced) {
      gsap.to(marker, { y: top, duration: T.micro, ease: E.cut });
    } else {
      gsap.set(marker, { y: top });
    }
  };

  /** Reads where each line sits inside the panel. The code does not move, so this runs on layout changes only. */
  const measure = (): void => {
    const origin = panel.getBoundingClientRect();
    const border = panel.clientTop;
    lineTops = allLines.map((line) => line.getBoundingClientRect().top - origin.top - border);
    const first = allLines[0];
    marker.style.height = `${first ? first.getBoundingClientRect().height : 0}px`;
    placeMarker(markerIndex, false);
  };

  // ---------- Scroll-driven stream (C2, the Sequence of direction-act2 code) ----------

  /**
   * One scroll position. q is the stream progress: the response characters light at q, and the marker is on line
   * min(N - 1, floor(q N)). Character j is lit when q is at least (j + 1) / J, which is the same as j < floor(q J).
   */
  const applyProgress = (p: number): void => {
    const q = clamp01((p - STREAM_FROM) / STREAM_SPAN);
    setLit(Math.floor(q * charCount));
    const index = Math.min(lineCount - 1, Math.floor(q * lineCount));
    if (index !== markerIndex) {
      markerIndex = index;
      placeMarker(index, true);
    }
  };

  /** Reduced motion: the response is in its token colours and the marker is on line 1, with no scroll link. */
  const applyStatic = (): void => {
    setLit(charCount);
    markerIndex = 0;
    placeMarker(0, false);
  };

  let stream: ScrollTrigger | null = null;

  /** Section progress p from the section's centre (p 0) to its bottom edge at the centre (p 1), as C2 defines. */
  const armStream = (): void => {
    if (stream !== null) return;
    stream = ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onUpdate: (self) => applyProgress(self.progress),
    });
    applyProgress(stream.progress);
  };

  const disarmStream = (): void => {
    stream?.kill();
    stream = null;
  };

  // ---------- Title reveal (direction.md heading 8, rule 15; D2.3) ----------

  // The tokens are read from the section, so the colours are the token values even while a glyph holds its start colour.
  const tokens = getComputedStyle(section);
  const grey = tokens.getPropertyValue('--text-3').trim();
  const titleInk = tokens.getPropertyValue('--text-1').trim();
  const kickerInk = tokens.getPropertyValue('--seal-text').trim();
  const introInk = tokens.getPropertyValue('--text-2').trim();

  let split: SplitText | null = null;
  let reveal: gsap.core.Timeline | null = null;
  let revealTrigger: ScrollTrigger | null = null;
  let revealed = false;

  /**
   * One paused timeline for the current split. The kicker leads, and the intro follows T.micro later: both settle from
   * text-3 to their token colour over T.beat5 (C8). Each line of the title is staggered with the front profile over T.half,
   * and each character settles to its place and its token colour over T.beat7. A line of fewer than five characters
   * starts all of them together. Opacity is never changed.
   */
  const buildReveal = (lines: readonly Element[]): gsap.core.Timeline => {
    const timeline = gsap.timeline({ paused: true });
    gsap.set([kicker, intro], { color: grey });
    timeline.to(kicker, { color: kickerInk, duration: T.beat5, ease: E.settle, clearProps: 'color' }, 0);
    timeline.to(intro, { color: introInk, duration: T.beat5, ease: E.settle, clearProps: 'color' }, T.micro);
    for (const line of lines) {
      const glyphs = Array.from(line.querySelectorAll<HTMLElement>('.code__title-char'));
      const n = glyphs.length;
      const offsets =
        n < STAGGER_MIN_CHARS ? glyphs.map(() => 0) : weightedStagger(n, { total: T.half, weight: 'front' });
      const centre = (n - 1) / 2;
      glyphs.forEach((glyph, i) => {
        const em = parseFloat(getComputedStyle(glyph).fontSize);
        gsap.set(glyph, { x: (i - centre) * DISPLACE_EM * em, color: grey });
        timeline.to(
          glyph,
          { x: 0, color: titleInk, duration: T.beat7, ease: E.settle, clearProps: 'transform,color' },
          offsets[i],
        );
      });
    }
    return timeline;
  };

  const splitTitle = (): void => {
    if (split !== null || revealed) return;
    split = SplitText.create(title, {
      type: 'lines,chars',
      tag: 'span',
      linesClass: 'code__title-line',
      charsClass: 'code__title-char',
      aria: 'auto',
      autoSplit: true,
      onSplit: (self: SplitText) => {
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
  };

  const playReveal = (): void => {
    if (revealed || reveal === null) return;
    revealed = true;
    reveal.eventCallback('onComplete', settleTitle);
    reveal.play();
  };

  const armReveal = (): void => {
    if (revealTrigger !== null) return;
    revealTrigger = ScrollTrigger.create({
      trigger: title,
      start: REVEAL_START,
      once: true,
      onEnter: playReveal,
    });
  };

  const mountTitle = (): void => {
    if (revealed) return;
    splitTitle();
    armReveal();
  };

  /** Reduced motion: the title is static, with no split and no trigger. The kicker and the intro take their own colours. */
  const unmountTitle = (): void => {
    if (revealed) return;
    revealTrigger?.kill();
    revealTrigger = null;
    reveal?.kill();
    reveal = null;
    if (split !== null) {
      split.kill();
      split.revert();
      split = null;
    }
    gsap.set([kicker, intro], { clearProps: 'color' });
  };

  // ---------- Copy (heading 13: secondary button; "Copied" for T.breath) ----------

  const idleLabel = copy.textContent?.trim() ?? '';
  const copiedLabel = copy.dataset.copiedLabel ?? '';
  let copiedTimer: gsap.core.Tween | null = null;

  const showCopied = (): void => {
    copy.textContent = copiedLabel;
    copiedTimer?.kill();
    copiedTimer = gsap.delayedCall(T.breath, () => {
      copy.textContent = idleLabel;
      copiedTimer = null;
    });
  };

  copy.addEventListener('click', () => {
    const clipboard = navigator.clipboard;
    if (!clipboard) return;
    const plain = requestLines.map((line) => line.textContent ?? '').join('\n');
    clipboard.writeText(plain).then(showCopied, () => undefined);
  });

  // ---------- Motion state: reduced or not ----------

  const applyMotion = (): void => {
    if (reduced) {
      disarmStream();
      unmountTitle();
      responseCode.classList.remove('is-stream');
      applyStatic();
    } else {
      responseCode.classList.add('is-stream');
      mountTitle();
      armStream();
    }
  };

  // ---------- Start ----------

  panel.classList.add('is-live');
  measure();
  applyMotion();
  ScrollTrigger.addEventListener('refresh', measure);
  bus.once('loader:done', measure);
  void document.fonts.ready.then(measure);
  onReducedMotionChange((value) => {
    reduced = value;
    applyMotion();
  });
}

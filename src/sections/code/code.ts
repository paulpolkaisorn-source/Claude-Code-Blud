// The code section's 2D layer (design/direction-act2.md, code; design/drafts/director-decisions.md D16.1, D18, D20.3 and
// D21.1 to D21.3; design/direction.md headings 8, 9 and 13).
//
// This file owns the title reveal (SplitText, once, when the title top crosses 80 per cent of the viewport height),
// the colour settle of the kicker and the intro with it, the request that types itself out with its caret (D21.3),
// the scroll-driven colour stream of the EXAMPLE OUTPUT block, the live line marker over both code blocks, the copy
// button and the character split of the response. Section progress p (C2) comes from one ScrollTrigger, from the
// section's centre to its bottom edge. It is raw: Lenis is the only smoothing (D21.1).
//
// The request types out over p 0.10 to 0.45, then the response streams over p 0.45 to 0.75 (D21.3). The code lines do
// not move. The text is in the HTML once: an untyped character group is transparent, not removed, so no-JS, reduced
// motion and screen readers get the whole program, and the copy button copies it.
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

/** The request types out over section progress 0.10 to 0.45 (D21.3). */
const TYPE_FROM = 0.1;
const TYPE_TO = 0.45;
/** The response streams over 0.45 to 0.75, as the act specifies (D21.3; the Sequence of direction-act2, code). */
const STREAM_FROM = TYPE_TO;
const STREAM_SPAN = 0.3;
/** The typing cost of a character group, in character widths, on top of its own characters. */
const GROUP_COST = 0.5;
/** The pause at each line end, in character widths. */
const LINE_HOLD = 3;
/** A token longer than this is typed in parts of 3 or 4 characters. Shorter tokens are typed whole. */
const TOKEN_MAX = 6;
/** The title reveals once, when its top crosses this line (direction.md heading 8, rule 5 and rule 15). */
const REVEAL_START = 'top 80%';
/** Each character starts displaced by (i - centre) times this many em (direction.md heading 8, rule 15). */
const DISPLACE_EM = 0.06;
/** A line of fewer characters than this starts all of its characters together (rule 15). */
const STAGGER_MIN_CHARS = 5;

interface Piece {
  text: string;
  cls: string;
}

/** Words, punctuation runs and whitespace. Joined in order, the matches are the text of the line. */
const UNITS = /\s+|[A-Za-z0-9_$]+|[^\sA-Za-z0-9_$]+/g;
const WHITESPACE = /^\s+$/;
const WORD = /^[A-Za-z0-9_$]+$/;

type Kind = 'word' | 'punct' | 'space';

/** One unit of a line: a word, a punctuation run or a whitespace run, with the syntax colour of its element. */
interface Unit {
  text: string;
  cls: string;
  kind: Kind;
}

function kindOf(text: string): Kind {
  if (WHITESPACE.test(text)) return 'space';
  return WORD.test(text) ? 'word' : 'punct';
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** A deterministic value in [0, 1) for group k, so the typing rhythm is uneven and the same on every load. */
function jitter(k: number): number {
  const s = Math.sin((k + 1) * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/** Splits a token into parts of 3 or 4 characters, as even as possible. */
function partsOf(text: string): string[] {
  const parts = Math.ceil(text.length / 4);
  const base = Math.floor(text.length / parts);
  const extra = text.length % parts;
  const out: string[] = [];
  let at = 0;
  for (let i = 0; i < parts; i += 1) {
    const size = base + (i < extra ? 1 : 0);
    out.push(text.slice(at, at + size));
    at += size;
  }
  return out;
}

/**
 * The character groups of one request line (D21.3). A group is a token, or a 3 to 4 character part of a longer token,
 * and it never crosses a syntax colour. Punctuation of up to two characters joins the word it touches when both have
 * the same colour, so `"Charged` and `seat."` are each typed as one token. Whitespace joins the group before it, and a
 * single character joins the group before it when the two fit in four characters. The groups join back to the line's
 * text exactly.
 */
function groupsOf(line: HTMLElement): Piece[] {
  const units: Unit[] = [];
  for (const node of Array.from(line.childNodes)) {
    const cls = node instanceof HTMLElement ? node.className : '';
    for (const match of (node.textContent ?? '').matchAll(UNITS)) {
      units.push({ text: match[0], cls, kind: kindOf(match[0]) });
    }
  }

  // Short punctuation in front of a word of its own colour is typed with that word.
  const joined: Unit[] = [];
  let lead = '';
  units.forEach((unit, i) => {
    const next = units[i + 1];
    if (unit.kind === 'punct' && unit.text.length <= 2 && next !== undefined && next.kind === 'word' && next.cls === unit.cls) {
      lead += unit.text;
      return;
    }
    joined.push({ ...unit, text: lead + unit.text });
    lead = '';
  });

  // Short punctuation after a word of its own colour is typed with that word.
  const tokens: Unit[] = [];
  for (const unit of joined) {
    const prev = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
    if (unit.kind === 'punct' && unit.text.length <= 2 && prev !== undefined && prev.kind === 'word' && prev.cls === unit.cls) {
      prev.text += unit.text;
      continue;
    }
    tokens.push({ ...unit });
  }

  const groups: Piece[] = [];
  let pending = '';
  for (const token of tokens) {
    if (token.kind === 'space') {
      if (groups.length > 0) groups[groups.length - 1].text += token.text;
      else pending += token.text;
      continue;
    }
    const parts = token.text.length > TOKEN_MAX ? partsOf(token.text) : [token.text];
    for (const part of parts) {
      const last = groups.length > 0 ? groups[groups.length - 1] : undefined;
      if (pending === '' && last !== undefined && last.cls === token.cls && part.length === 1 && last.text.length < 4) {
        last.text += part;
      } else {
        groups.push({ text: pending + part, cls: token.cls });
        pending = '';
      }
    }
  }
  if (pending !== '') groups.push({ text: pending, cls: '' });
  return groups;
}

/**
 * The progress at which each request group appears (D21.3). A group costs its characters plus GROUP_COST, with a
 * deterministic jitter, and every line end adds LINE_HOLD. A line's share of the window is therefore weighted by its
 * length, with a short hold before the next line. The last group appears at TYPE_TO exactly.
 */
function typingSchedule(lengths: readonly number[], lineOf: readonly number[], lineCount: number): number[] {
  const cumulative: number[] = [];
  let acc = 0;
  let k = 0;
  for (let line = 0; line < lineCount; line += 1) {
    while (k < lengths.length && lineOf[k] === line) {
      acc += (lengths[k] + GROUP_COST) * (0.85 + 0.3 * jitter(k));
      cumulative.push(acc);
      k += 1;
    }
    if (line < lineCount - 1) acc += LINE_HOLD;
  }
  const at = cumulative.map((c) => TYPE_FROM + ((TYPE_TO - TYPE_FROM) * c) / acc);
  if (at.length > 0) at[at.length - 1] = TYPE_TO;
  return at;
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
  const requestPre = requestCode?.closest<HTMLElement>('pre') ?? null;
  if (!kicker || !title || !intro || !panel || !requestCode || !responseCode || !marker || !copy || !requestPre) return;

  gsap.registerPlugin(ScrollTrigger, SplitText);

  let reduced = ctx.reducedMotion;

  // ---------- Lines, the request groups and the response characters ----------

  const requestLines = Array.from(requestCode.querySelectorAll<HTMLElement>('.code__line'));
  const responseLines = Array.from(responseCode.querySelectorAll<HTMLElement>('.code__line'));
  // The marker walks both blocks as one list of lines: the request first, then the response.
  const allLines = [...requestLines, ...responseLines];
  const lineCount = allLines.length;

  // Each request line becomes character groups, each a span in its token colour. All of them start untyped.
  const groupNodes: HTMLSpanElement[] = [];
  const groupLine: number[] = [];
  requestLines.forEach((line, index) => {
    const pieces = groupsOf(line);
    line.replaceChildren(
      ...pieces.map((piece) => {
        const span = document.createElement('span');
        span.className = piece.cls ? `${piece.cls} code__group is-untyped` : 'code__group is-untyped';
        span.textContent = piece.text;
        groupNodes.push(span);
        groupLine.push(index);
        return span;
      }),
    );
  });
  const groupCount = groupNodes.length;
  const appear = typingSchedule(
    groupNodes.map((node) => node.textContent?.length ?? 0),
    groupLine,
    requestLines.length,
  );

  // The caret (D21.3): 2 px wide, one line tall, in seal-text. It sits inside the request's scroll box, so it scrolls
  // with the code, and it takes no space in the layout.
  const caret = document.createElement('span');
  caret.className = 'code__caret';
  caret.setAttribute('aria-hidden', 'true');
  caret.hidden = true;
  requestPre.append(caret);

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
  let typed = 0;
  let lineTops: number[] = [];
  let requestTops: number[] = [];
  let groupRight: number[] = [];

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

  /** The caret sits after the last typed group, or at the start of the first line when nothing is typed. */
  const placeCaret = (): void => {
    if (requestTops.length === 0) return;
    const at = typed > 0 ? typed - 1 : -1;
    const x = at >= 0 ? groupRight[at] : 0;
    const y = requestTops[at >= 0 ? groupLine[at] : 0];
    caret.style.left = `${x}px`;
    caret.style.top = `${y}px`;
  };

  /** Reads where the lines and the request groups sit. The code does not move, so this runs on layout changes only. */
  const measure = (): void => {
    const origin = panel.getBoundingClientRect();
    const border = panel.clientTop;
    lineTops = allLines.map((line) => line.getBoundingClientRect().top - origin.top - border);
    const first = allLines[0];
    marker.style.height = `${first ? first.getBoundingClientRect().height : 0}px`;
    placeMarker(markerIndex, false);

    // The caret's coordinates are measured inside the request box's scrollable content, so they hold when it scrolls.
    const box = requestPre.getBoundingClientRect();
    const boxX = box.left + requestPre.clientLeft - requestPre.scrollLeft;
    const boxY = box.top + requestPre.clientTop - requestPre.scrollTop;
    groupRight = groupNodes.map((node) => node.getBoundingClientRect().right - boxX);
    requestTops = requestLines.map((line) => line.getBoundingClientRect().top - boxY);
    placeCaret();
  };

  /** Types the first count groups and untypes the rest. Only the groups that change are touched. */
  const setTyped = (count: number): void => {
    const next = Math.min(groupCount, Math.max(0, count));
    if (next === typed) return;
    for (let j = typed; j < next; j += 1) groupNodes[j].classList.remove('is-untyped');
    for (let j = next; j < typed; j += 1) groupNodes[j].classList.add('is-untyped');
    typed = next;
    placeCaret();
  };

  /** How many groups are typed at section progress p. The scroll may run either way, so it counts from the current state. */
  const typedAt = (p: number): number => {
    let n = typed;
    while (n < groupCount && p >= appear[n]) n += 1;
    while (n > 0 && p < appear[n - 1]) n -= 1;
    return n;
  };

  // ---------- Caret blink (D21.3): T.beat5 on, T.beat5 off, cut; only while p is still ----------

  const blink = gsap.timeline({ paused: true, repeat: -1 });
  blink.set(caret, { opacity: 1 }, 0);
  blink.set(caret, { opacity: 0 }, T.beat5);
  blink.set(caret, { opacity: 1 }, T.beat5 * 2);
  let still: gsap.core.Tween | null = null;

  /** The caret on and not blinking. */
  const restCaret = (): void => {
    blink.pause();
    still?.kill();
    still = null;
    gsap.set(caret, { opacity: 1 });
  };

  /** Progress moved: the caret stays on, and blinks again once p has been still for T.beat5. */
  const moveCaret = (): void => {
    restCaret();
    still = gsap.delayedCall(T.beat5, () => {
      still = null;
      blink.play(0);
    });
  };

  /** The caret is shown while the request types, and gone from p 0.45 on. Reduced motion has no caret. */
  const applyCaret = (p: number, moved: boolean): void => {
    if (reduced || p >= STREAM_FROM) {
      caret.hidden = true;
      restCaret();
      return;
    }
    const wasHidden = caret.hidden;
    caret.hidden = false;
    if (moved || wasHidden) moveCaret();
  };

  // ---------- Scroll-driven typing and stream (C2, D21.3) ----------

  let lastP = Number.NaN;

  /**
   * One scroll position. The request types over p 0.10 to 0.45. The response is coloured over p 0.45 to 0.75, and the
   * marker is on line min(N - 1, floor(q N)), where q is the stream progress and N the lines of both blocks.
   */
  const applyProgress = (p: number): void => {
    const moved = p !== lastP;
    lastP = p;
    setTyped(typedAt(p));
    const q = clamp01((p - STREAM_FROM) / STREAM_SPAN);
    setLit(Math.floor(q * charCount));
    const index = Math.min(lineCount - 1, Math.floor(q * lineCount));
    if (index !== markerIndex) {
      markerIndex = index;
      placeMarker(index, true);
    }
    panel.classList.toggle('is-streaming', p >= STREAM_FROM);
    applyCaret(p, moved);
  };

  /** Reduced motion: every group is typed, the response is in its token colours and the marker is on line 1. No caret. */
  const applyStatic = (): void => {
    setTyped(groupCount);
    setLit(charCount);
    markerIndex = 0;
    placeMarker(0, false);
    panel.classList.add('is-streaming');
    caret.hidden = true;
    restCaret();
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

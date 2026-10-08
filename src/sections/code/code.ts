// The code section's 2D layer (design/direction-act2.md, code; design/drafts/director-decisions.md D16.1, D18, D20.3,
// D21.1 to D21.3 and D23.4; design/direction.md headings 8, 9 and 13).
//
// This file owns the title reveal (SplitText, once, when the title top crosses 80 per cent of the viewport height),
// the colour settle of the kicker and the intro with it, the request that types itself out with its caret (D21.3),
// the response that streams in bursts with its caret (D23.4), the live line marker over both code blocks, the copy
// button and the character split of the response. Section progress p (C2) comes from one ScrollTrigger, from the
// section's centre to its bottom edge. It is raw: Lenis is the only smoothing (D21.1).
//
// The two windows are set at layout time (D23.4, and again on every resize and font load). The request starts typing
// when its first code line reaches 85 per cent of the viewport height, and types over 0.30 of progress. The response
// then streams over the next 0.25, in bursts of 1 to 4 words at an uneven cadence. Both windows are clamped to the
// section's progress range, and compressed by one factor when the section is too short for both. The code lines do not
// move. The text is in the HTML once: an untyped group or an unstreamed character is transparent, not removed, so the
// layout has its final size from the first frame, no-JS, reduced motion and screen readers get the whole program, and
// the copy button copies it.
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

/** The request starts typing when its first code line reaches this share of the viewport height (D23.4). */
const TYPE_LINE_AT = 0.85;
/** The request types out over this much section progress (D23.4). */
const TYPE_SPAN = 0.3;
/** The response streams over this much section progress, from the end of the typing (D23.4). */
const STREAM_SPAN = 0.25;
/** The typing cost of a character group, in character widths, on top of its own characters. */
const GROUP_COST = 0.5;
/** The pause at each line end, in character widths. */
const LINE_HOLD = 3;
/** A token longer than this is typed in parts of 3 or 4 characters. Shorter tokens are typed whole. */
const TOKEN_MAX = 6;
/** A burst of the response holds 1 to this many words (D23.4). */
const BURST_MAX_WORDS = 4;
/** The cost of a burst, in character widths, on top of its own characters. */
const BURST_COST = 2;
/** A burst that ends a sentence waits this many character widths longer, so the cadence is uneven on purpose. */
const SENTENCE_HOLD = 6;
/** The title reveals once, when its top crosses this line (direction.md heading 8, rule 5 and rule 15). */
const REVEAL_START = 'top 80%';
/** Each character starts displaced by (i - centre) times this many em (direction.md heading 8, rule 15). */
const DISPLACE_EM = 0.06;
/** A line of fewer characters than this starts all of its characters together (rule 15). */
const STAGGER_MIN_CHARS = 5;
/** The space kept between a caret and the edge of its box when the box scrolls to follow it (D23.4). */
const CARET_MARGIN = 12;

interface Piece {
  text: string;
  cls: string;
}

/** One burst of the response: its character count, the index after its last character, and its weight in the cadence. */
interface Burst {
  chars: number;
  end: number;
  weight: number;
}

/** Words, punctuation runs and whitespace. Joined in order, the matches are the text of the line. */
const UNITS = /\s+|[A-Za-z0-9_$]+|[^\sA-Za-z0-9_$]+/g;
const WHITESPACE = /^\s+$/;
const WORD = /^[A-Za-z0-9_$]+$/;
/** A word of the response with the spaces after it (D23.4). */
const RESPONSE_WORD = /\S+\s*/g;
const SENTENCE_END = /[.!?]\s*$/;

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

/** A deterministic value in [0, 1) for item k, so the rhythm is uneven and the same on every load. */
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
 * The start progress of each item of a sequence, spread over the window from `from` to `to` (D23.4). The first item
 * starts at `from` and the last at `to`. The gap before an item is proportional to the weight of the item before it, so
 * the rhythm is uneven and the sequence fills the window exactly.
 */
function scheduleOf(weights: readonly number[], from: number, to: number): number[] {
  const n = weights.length;
  if (n <= 1) return weights.map(() => from);
  let before = 0;
  for (let k = 0; k < n - 1; k += 1) before += weights[k];
  const at: number[] = [];
  let acc = 0;
  for (let k = 0; k < n - 1; k += 1) {
    at.push(from + (before > 0 ? ((to - from) * acc) / before : 0));
    acc += weights[k];
  }
  at.push(to);
  return at;
}

/**
 * The bursts of the response (D23.4). A word is a run of non-space characters with the spaces after it. A burst is the
 * next 1 to 4 words in order, so a burst can run on to the next line. The sizes come from a fixed sequence, so the
 * rhythm is uneven and the same on every load. The last burst takes any characters the words do not cover.
 */
function burstsOf(lines: readonly string[]): Burst[] {
  const words: string[] = [];
  for (const line of lines) {
    for (const match of line.matchAll(RESPONSE_WORD)) words.push(match[0]);
  }
  const total = lines.reduce((sum, line) => sum + line.length, 0);
  const bursts: Burst[] = [];
  let i = 0;
  let end = 0;
  while (i < words.length) {
    const k = bursts.length;
    const size = Math.min(words.length - i, 1 + Math.floor(jitter(1000 + k) * BURST_MAX_WORDS));
    let chars = 0;
    for (let j = i; j < i + size; j += 1) chars += words[j].length;
    end += chars;
    const sentence = SENTENCE_END.test(words[i + size - 1]);
    const weight = (chars + BURST_COST) * (0.6 + 0.8 * jitter(2000 + k)) + (sentence ? SENTENCE_HOLD : 0);
    bursts.push({ chars, end, weight });
    i += size;
  }
  const last = bursts[bursts.length - 1];
  if (last !== undefined) {
    last.chars += total - end;
    last.end = total;
  }
  return bursts;
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
  const responsePre = responseCode?.closest<HTMLElement>('pre') ?? null;
  if (!kicker || !title || !intro || !panel || !requestCode || !responseCode || !marker || !copy || !requestPre || !responsePre) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);

  let reduced = ctx.reducedMotion;

  // ---------- Lines, the request groups, the response bursts and characters ----------

  const requestLines = Array.from(requestCode.querySelectorAll<HTMLElement>('.code__line'));
  const responseLines = Array.from(responseCode.querySelectorAll<HTMLElement>('.code__line'));
  const firstLine = requestLines[0];
  if (firstLine === undefined) return;
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
  // A group's weight is its characters and its jitter, and a line end adds its hold before the next line's first group.
  const groupWeights = groupNodes.map((node, k) => {
    const hold = k + 1 < groupCount ? (groupLine[k + 1] - groupLine[k]) * LINE_HOLD : 0;
    return ((node.textContent?.length ?? 0) + GROUP_COST) * (0.85 + 0.3 * jitter(k)) + hold;
  });

  // The response is cut into bursts before its characters are spans, while the text is still whole.
  const responseTexts = responseLines.map((line) => line.textContent ?? '');
  const bursts = burstsOf(responseTexts);
  const burstWeights = bursts.map((burst) => burst.weight);

  // Each response character becomes a span, so it can be shown on its own. The text is unchanged.
  const chars: HTMLElement[] = [];
  const charLine: number[] = [];
  responseLines.forEach((line, index) => {
    line.textContent = '';
    for (const ch of responseTexts[index]) {
      const span = document.createElement('span');
      span.className = 'code__char';
      span.textContent = ch;
      line.append(span);
      chars.push(span);
      charLine.push(index);
    }
  });
  const charCount = chars.length;

  // The carets (D21.3, D23.4): 2 px wide, one line tall, in seal-text. Each sits inside its block's scroll box, so it
  // scrolls with the code, and it takes no space in the layout. One of them is shown at a time.
  const makeCaret = (host: HTMLElement): HTMLSpanElement => {
    const caret = document.createElement('span');
    caret.className = 'code__caret';
    caret.setAttribute('aria-hidden', 'true');
    caret.hidden = true;
    host.append(caret);
    return caret;
  };
  const requestCaret = makeCaret(requestPre);
  const responseCaret = makeCaret(responsePre);
  const carets = [requestCaret, responseCaret];

  // The state of the page, and the geometry it is placed by. Measured on layout changes only.
  let typed = 0;
  let litCount = 0;
  let streamedCount = 0;
  let markerIndex = 0;
  let lineTops: number[] = [];
  let requestTops: number[] = [];
  let groupRight: number[] = [];
  let responseTops: number[] = [];
  let charRight: number[] = [];
  let charLeft = 0;
  let shownCaret: HTMLElement | null = null;
  let lastP = Number.NaN;

  // The windows, in section progress (D23.4). layoutWindows sets them, and the schedules follow from them.
  let typeFrom = 0;
  let typeTo = 0;
  let streamFrom = 0;
  let streamTo = 0;
  let appear: number[] = [];
  let burstAt: number[] = [];

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

  /**
   * The request's caret sits after its last typed group, or at the start of the first line when nothing is typed. The
   * response's caret sits after its last streamed character, or at the start of the first line when nothing is streamed.
   */
  const placeCarets = (): void => {
    if (requestTops.length > 0) {
      const at = typed > 0 ? typed - 1 : -1;
      requestCaret.style.left = `${at >= 0 ? groupRight[at] : 0}px`;
      requestCaret.style.top = `${requestTops[at >= 0 ? groupLine[at] : 0]}px`;
    }
    if (responseTops.length > 0) {
      const at = litCount > 0 ? litCount - 1 : -1;
      responseCaret.style.left = `${at >= 0 ? charRight[at] : charLeft}px`;
      responseCaret.style.top = `${responseTops[at >= 0 ? charLine[at] : 0]}px`;
    }
  };

  /** Reads where the lines, the request groups and the response characters sit. The code does not move, so this runs on layout changes only. */
  const measure = (): void => {
    const origin = panel.getBoundingClientRect();
    const border = panel.clientTop;
    lineTops = allLines.map((line) => line.getBoundingClientRect().top - origin.top - border);
    marker.style.height = `${firstLine.getBoundingClientRect().height}px`;
    placeMarker(markerIndex, false);

    // The coordinates are measured inside each box's scrollable content, so they hold when the box scrolls.
    const box = requestPre.getBoundingClientRect();
    const boxX = box.left + requestPre.clientLeft - requestPre.scrollLeft;
    const boxY = box.top + requestPre.clientTop - requestPre.scrollTop;
    groupRight = groupNodes.map((node) => node.getBoundingClientRect().right - boxX);
    requestTops = requestLines.map((line) => line.getBoundingClientRect().top - boxY);

    const response = responsePre.getBoundingClientRect();
    const responseX = response.left + responsePre.clientLeft - responsePre.scrollLeft;
    const responseY = response.top + responsePre.clientTop - responsePre.scrollTop;
    charRight = chars.map((span) => span.getBoundingClientRect().right - responseX);
    charLeft = (chars.length > 0 ? chars[0].getBoundingClientRect().left : response.left) - responseX;
    responseTops = responseLines.map((line) => line.getBoundingClientRect().top - responseY);
    placeCarets();
  };

  /** Types the first count groups and untypes the rest. Only the groups that change are touched. */
  const setTyped = (count: number): void => {
    const next = Math.min(groupCount, Math.max(0, count));
    if (next === typed) return;
    for (let j = typed; j < next; j += 1) groupNodes[j].classList.remove('is-untyped');
    for (let j = next; j < typed; j += 1) groupNodes[j].classList.add('is-untyped');
    typed = next;
    placeCarets();
  };

  /** Shows the first count response characters and hides the rest. Only the characters that change are touched. */
  const setLit = (count: number): void => {
    const next = Math.min(charCount, Math.max(0, count));
    if (next === litCount) return;
    for (let j = litCount; j < next; j += 1) chars[j].classList.add('is-lit');
    for (let j = next; j < litCount; j += 1) chars[j].classList.remove('is-lit');
    litCount = next;
    placeCarets();
  };

  /** How many request groups are typed at section progress p. The scroll may run either way, so it counts from the current state. */
  const typedAt = (p: number): number => {
    let n = typed;
    while (n < appear.length && p >= appear[n]) n += 1;
    while (n > 0 && p < appear[n - 1]) n -= 1;
    return n;
  };

  /** How many response characters are streamed at section progress p: every character of the bursts whose start has been reached (D23.4). */
  const streamedAt = (p: number): number => {
    let n = streamedCount;
    while (n < burstAt.length && p >= burstAt[n]) n += 1;
    while (n > 0 && p < burstAt[n - 1]) n -= 1;
    streamedCount = n;
    return n > 0 ? bursts[n - 1].end : 0;
  };

  // ---------- Caret blink (D21.3): T.beat5 on, T.beat5 off, cut; only while p is still ----------

  const blink = gsap.timeline({ paused: true, repeat: -1 });
  blink.set(carets, { opacity: 1 }, 0);
  blink.set(carets, { opacity: 0 }, T.beat5);
  blink.set(carets, { opacity: 1 }, T.beat5 * 2);
  let still: gsap.core.Tween | null = null;

  /** The caret on and not blinking. */
  const restCaret = (): void => {
    blink.pause();
    still?.kill();
    still = null;
    gsap.set(carets, { opacity: 1 });
  };

  /** Progress moved: the caret stays on, and blinks again once p has been still for T.beat5. */
  const moveCaret = (): void => {
    restCaret();
    still = gsap.delayedCall(T.beat5, () => {
      still = null;
      blink.play(0);
    });
  };

  /**
   * Keeps the caret inside the visible part of its block (D23.4). On a phone a streamed line runs past the edge of its box,
   * so the box scrolls sideways, and only when the caret has moved out of view. The reader can still scroll the box.
   */
  const followCaret = (box: HTMLElement, caret: HTMLElement): void => {
    const x = parseFloat(caret.style.left);
    if (Number.isNaN(x)) return;
    const visible = box.clientWidth;
    if (x > box.scrollLeft + visible - CARET_MARGIN) {
      box.scrollLeft = x - visible + CARET_MARGIN;
    } else if (x < box.scrollLeft + CARET_MARGIN) {
      // Back past the edge: the start of the block when the caret fits from there, so the first words show again.
      box.scrollLeft = x < visible - CARET_MARGIN ? 0 : x - CARET_MARGIN;
    }
  };

  /**
   * The live caret (D21.3, D23.4). The request's caret waits at its insertion point and types. From the end of the typing
   * the response's caret follows the stream, and from the end of the stream neither shows. Reduced motion has no caret.
   */
  const applyCaret = (p: number, moved: boolean): void => {
    const next = reduced ? null : p < typeTo ? requestCaret : p < streamTo ? responseCaret : null;
    requestCaret.hidden = next !== requestCaret;
    responseCaret.hidden = next !== responseCaret;
    if (next === null) {
      shownCaret = null;
      restCaret();
      return;
    }
    if (moved || next !== shownCaret) {
      moveCaret();
      followCaret(next === requestCaret ? requestPre : responsePre, next);
    }
    shownCaret = next;
  };

  // ---------- Scroll-driven typing and stream (C2, D23.4) ----------

  /**
   * One scroll position. The request types over its window and the response streams over the next. The marker is on line
   * min(N - 1, floor(q N)), where q is the stream progress and N the lines of both blocks, and it is hidden until the
   * stream starts.
   */
  const applyProgress = (p: number): void => {
    const moved = p !== lastP;
    lastP = p;
    setTyped(typedAt(p));
    setLit(streamedAt(p));
    const span = streamTo - streamFrom;
    const q = span > 0 ? clamp01((p - streamFrom) / span) : p >= streamFrom ? 1 : 0;
    const index = Math.min(lineCount - 1, Math.floor(q * lineCount));
    if (index !== markerIndex) {
      markerIndex = index;
      placeMarker(index, true);
    }
    panel.classList.toggle('is-streaming', p >= typeTo);
    // Before the stream the response holds no visible text, so its box goes back to the start (D23.4).
    if (p < typeTo && responsePre.scrollLeft !== 0) responsePre.scrollLeft = 0;
    applyCaret(p, moved);
  };

  /** Reduced motion: every group is typed, the response is shown whole and the marker is on line 1. No caret. */
  const applyStatic = (): void => {
    setTyped(groupCount);
    setLit(charCount);
    markerIndex = 0;
    placeMarker(0, false);
    panel.classList.add('is-streaming');
    shownCaret = null;
    requestCaret.hidden = true;
    responseCaret.hidden = true;
    restCaret();
  };

  let stream: ScrollTrigger | null = null;

  /**
   * The windows at layout time (D23.4). The request types from the section progress at which its first code line reaches
   * 85 per cent of the viewport height, and the response streams from the end of the typing. The progress is the
   * ScrollTrigger's own (its start and end scroll positions), so the windows agree with the progress that drives them.
   * Both stay inside [0, 1]: a start before 0 is set to 0, and a section too short for both windows scales them by one
   * factor, so their ratio holds and the stream ends at 1.
   */
  const layoutWindows = (): void => {
    if (stream === null) return;
    const range = stream.end - stream.start;
    const lineTop = firstLine.getBoundingClientRect().top + window.scrollY;
    const raw = range > 0 ? (lineTop - TYPE_LINE_AT * window.innerHeight - stream.start) / range : 0;
    typeFrom = clamp01(raw);
    const room = 1 - typeFrom;
    const total = TYPE_SPAN + STREAM_SPAN;
    const scale = room >= total ? 1 : room / total;
    typeTo = typeFrom + TYPE_SPAN * scale;
    streamFrom = typeTo;
    streamTo = streamFrom + STREAM_SPAN * scale;
  };

  /** The start progress of every request group and every response burst, in the current windows. */
  const rebuildSchedules = (): void => {
    appear = scheduleOf(groupWeights, typeFrom, typeTo);
    burstAt = scheduleOf(burstWeights, streamFrom, streamTo);
  };

  /**
   * Layout time (D23.4, and on every resize and font load): the geometry, then the windows and their schedules, then the
   * state at the current progress. Reduced motion has no stream, so it stops after the geometry.
   */
  const layout = (): void => {
    measure();
    if (stream === null) return;
    layoutWindows();
    rebuildSchedules();
    applyProgress(stream.progress);
  };

  /** Section progress p from the section's centre (p 0) to its bottom edge at the centre (p 1), as C2 defines. */
  const armStream = (): void => {
    if (stream !== null) return;
    stream = ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onUpdate: (self) => applyProgress(self.progress),
    });
    layout();
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
  ScrollTrigger.addEventListener('refresh', layout);
  bus.once('loader:done', layout);
  void document.fonts.ready.then(layout);
  onReducedMotionChange((value) => {
    reduced = value;
    applyMotion();
  });
}

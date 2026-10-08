// The example stream of the speed section (design/direction-act1.md, speed, Keep-alive; direction.md heading 8, rules 4
// and 9). It is a keep-alive, not an entrance: it runs only while the section is in view, and it pauses and keeps its
// place when the section leaves the viewport.
//
// A run is 40 tokens. Token k enters at weightedStagger(40, { total: 39 / r, weight: 'front' })[k] seconds after the run's
// first token, where r is the rate read once when the run starts: r = clamp(0.04 x |v|, 34, 160) tokens per second, with
// v the smoothed scroll velocity in px/s (scrollState). Each token enters in text-3 and settles to text-1 over T.beat5
// with settle. Text never fades, so a token is hidden before it enters and shown in full at its entry. After the 40th
// token the stream holds for T.breath, clears, and starts the next run at token 0.
import { gsap } from 'gsap';
import { E } from '../../core/ease';
import { scrollState } from '../../core/scroll';
import { T, weightedStagger } from '../../core/timing';

/** Tokens in one run: the 40 words of the example output (copy, speed section). */
export const STREAM_TOKENS = 40;

/** Lowest and highest rate in tokens per second, and the rate per px/s of scroll velocity (act I, speed, Keep-alive). */
export const STREAM_RATE_FLOOR = 34;
export const STREAM_RATE_CEILING = 160;
const RATE_PER_PX_PER_S = 0.04;

/** The rate of a run for a scroll velocity in px/s. It never falls below the floor, so the stream never stalls. */
export function streamRate(velocity: number): number {
  const raw = RATE_PER_PX_PER_S * Math.abs(velocity);
  return Math.min(STREAM_RATE_CEILING, Math.max(STREAM_RATE_FLOOR, raw));
}

/** The entry offsets of a run, in seconds after its first token, for a rate. Index k is token k. */
export function streamOffsets(rate: number): number[] {
  return weightedStagger(STREAM_TOKENS, { total: (STREAM_TOKENS - 1) / rate, weight: 'front' });
}

/** A stream drives the tokens it is given. Play starts or resumes it, and pause keeps its place. */
export interface Stream {
  play(): void;
  pause(): void;
  /** Stops the stream and leaves every token in its settled state, visible, with no caret. */
  finish(): void;
  dispose(): void;
}

/**
 * Creates the stream over tokens, in document order. entry is the colour a token enters in (text-3) and settled is the
 * colour it settles to (text-1), both read from the tokens by the caller. Nothing runs until play is called.
 */
export function createStream(tokens: readonly HTMLElement[], colours: { entry: string; settled: string }): Stream {
  let run: gsap.core.Timeline | null = null;
  let wanted = false;
  let alive = true;

  /** Marks token k as the last one to have entered, so the caret follows it. */
  function markCaret(k: number): void {
    for (let i = 0; i < tokens.length; i += 1) {
      tokens[i].classList.toggle('is-caret', i === k);
    }
  }

  /** Hides every token again and removes the caret, once a run has held for T.breath. */
  function clear(): void {
    for (const token of tokens) {
      token.classList.remove('is-caret');
      gsap.set(token, { visibility: 'hidden', color: colours.settled });
    }
  }

  /** Builds one run with its rate read now. When it ends, the next run starts at once if the stream is still wanted. */
  function build(): gsap.core.Timeline {
    const offsets = streamOffsets(streamRate(scrollState.velocity));
    const timeline = gsap.timeline({
      paused: true,
      onComplete: () => {
        run = null;
        if (alive && wanted) {
          run = build();
          run.play();
        }
      },
    });
    tokens.forEach((token, k) => {
      const at = offsets[k];
      timeline.call(markCaret, [k], at);
      timeline.set(token, { visibility: 'visible', color: colours.entry }, at);
      timeline.to(token, { color: colours.settled, duration: T.beat5, ease: E.settle }, at);
    });
    timeline.call(clear, [], offsets[STREAM_TOKENS - 1] + T.breath);
    return timeline;
  }

  return {
    play(): void {
      if (!alive) return;
      wanted = true;
      if (run === null) run = build();
      run.play();
    },
    pause(): void {
      wanted = false;
      run?.pause();
    },
    finish(): void {
      wanted = false;
      run?.kill();
      run = null;
      for (const token of tokens) {
        token.classList.remove('is-caret');
        gsap.set(token, { visibility: 'visible', color: colours.settled });
      }
    },
    dispose(): void {
      alive = false;
      wanted = false;
      run?.kill();
      run = null;
    },
  };
}

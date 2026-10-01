// Round clock and win rules (wiki: Update Log 3.6.2 / 5.1.0, Statistics, Killers trivia). Pure.
import { config } from "./config";

export type Winner = "killer" | "survivors" | "nobody";

export interface RoundState {
  /** Seconds left on the clock. */
  timeLeft: number;
  lms: boolean;
  /** Ticks until the next LMS mutual reveal. */
  lmsRevealIn: number;
  generatorsDone: number;
  ended: boolean;
  winner: Winner | null;
  endReason: string;
}

export function newRound(): RoundState {
  return {
    timeLeft: config().match.baseRoundSeconds,
    lms: false,
    lmsRevealIn: 0,
    generatorsDone: 0,
    ended: false,
    winner: null,
    endReason: "",
  };
}

/** Each finished generator layer (puzzle) removes secondsPerLayer from the clock. */
export function onLayerCompleted(r: RoundState): void {
  r.timeLeft = Math.max(0, r.timeLeft - config().match.secondsPerLayer);
}

export function onGeneratorCompleted(r: RoundState): void {
  r.generatorsDone++;
}

/** Each survivor elimination adds time (not during LMS: the LMS clock is fixed). */
export function onElimination(r: RoundState, bonusFraction = 1): void {
  if (!r.lms) r.timeLeft += config().match.secondsAddedPerElimination * bonusFraction;
}

/** Enters Last Man Standing: the clock becomes a fixed value. Returns true if it just started. */
export function maybeStartLms(r: RoundState, aliveSurvivors: number): boolean {
  if (!config().match.lastManStanding || r.lms || r.ended || aliveSurvivors !== 1) return false;
  r.lms = true;
  r.timeLeft = config().match.lmsSeconds;
  r.lmsRevealIn = 0;
  return true;
}

export interface WinInputs {
  aliveSurvivors: number;
  killerAlive: boolean;
  /** Guest 666 Blood Hunt: "the round cannot end on the timer while it is active". */
  timerBlocked: boolean;
}

/** Evaluates win conditions; sets r.winner/ended. Returns the winner or null. */
export function evaluate(r: RoundState, w: WinInputs): Winner | null {
  if (r.ended) return r.winner;
  if (!w.killerAlive && w.aliveSurvivors === 0) return end(r, "nobody", "The killer and the last survivor fell together.");
  if (!w.killerAlive && config().match.killerCanDie) return end(r, "survivors", "The killer was killed.");
  if (w.aliveSurvivors === 0) return end(r, "killer", "Every survivor was eliminated.");
  if (r.timeLeft <= 0 && !w.timerBlocked) return end(r, "survivors", "The survivors outlasted the clock.");
  return null;
}

function end(r: RoundState, winner: Winner, reason: string): Winner {
  r.ended = true;
  r.winner = winner;
  r.endReason = reason;
  return winner;
}

/** Advances the clock by dt seconds (never below 0). */
export function tickClock(r: RoundState, dt: number): void {
  if (!r.ended) r.timeLeft = Math.max(0, r.timeLeft - dt);
}

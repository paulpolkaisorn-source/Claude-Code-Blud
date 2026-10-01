// Match flow state machine (brief §3.1). Pure; the adapter performs side effects on transitions.
export type MatchPhase = "LOBBY" | "ROLE_SELECT" | "LOADING" | "HEAD_START" | "ROUND" | "ENDING" | "RESULTS";

const ALLOWED: Record<MatchPhase, MatchPhase[]> = {
  LOBBY: ["ROLE_SELECT"],
  ROLE_SELECT: ["LOADING", "LOBBY"],
  LOADING: ["HEAD_START", "LOBBY"],
  HEAD_START: ["ROUND", "ENDING", "LOBBY"],
  ROUND: ["ENDING", "LOBBY"],
  ENDING: ["RESULTS", "LOBBY"],
  RESULTS: ["LOBBY"],
};

export class MatchMachine {
  phase: MatchPhase = "LOBBY";
  readonly history: Array<{ from: MatchPhase; to: MatchPhase; reason: string }> = [];
  private listeners: Array<(from: MatchPhase, to: MatchPhase, reason: string) => void> = [];

  can(to: MatchPhase): boolean {
    return ALLOWED[this.phase].includes(to);
  }

  /** Moves to `to`; throws on an illegal transition so bugs surface in tests. */
  go(to: MatchPhase, reason = ""): void {
    if (!this.can(to)) throw new Error(`illegal match transition ${this.phase} -> ${to}`);
    const from = this.phase;
    this.phase = to;
    this.history.push({ from, to, reason });
    for (const l of this.listeners) l(from, to, reason);
  }

  /** Abort from anywhere back to LOBBY (forsaken:stop, host left). */
  abort(reason: string): void {
    if (this.phase === "LOBBY") return;
    this.go("LOBBY", reason);
  }

  onChange(fn: (from: MatchPhase, to: MatchPhase, reason: string) => void): void {
    this.listeners.push(fn);
  }

  get inMatch(): boolean {
    return this.phase === "LOADING" || this.phase === "HEAD_START" || this.phase === "ROUND" || this.phase === "ENDING";
  }
}

export function allowedTransitions(from: MatchPhase): readonly MatchPhase[] {
  return ALLOWED[from];
}

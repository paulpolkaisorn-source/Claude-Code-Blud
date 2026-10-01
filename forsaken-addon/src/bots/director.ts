// Owns one brain per bot participant and updates them (thinking is staggered across ticks).
import type { Game } from "../core/game";
import type { Actor } from "../entities/actor";
import { config } from "../core/config";
import { Brain } from "./brain";
import { SurvivorBrain } from "./survivor";
import { KillerBrain } from "./killer";
import { dist2D } from "../util/vec";

export class BotDirector {
  private readonly brains = new Map<string, Brain>();
  private n = 0;
  /** Profiling (ms per tick, measured by the adapter / self-test). */
  lastUpdateMs = 0;

  constructor(readonly game: Game) {}

  brainOf(a: Actor): Brain | undefined {
    return this.brains.get(a.id);
  }

  update(): void {
    const g = this.game;
    if (g.phase !== "ROUND" && g.phase !== "HEAD_START") return;
    const t0 = Date.now();
    const interval = config().bots.thinkIntervalTicks;
    for (const a of g.actors) {
      if (!a.isBot || a.isMinion) continue;
      let b = this.brains.get(a.id);
      if (!b) {
        const offset = this.n++ % interval;
        b = a.isKiller ? new KillerBrain(g, a, offset) : new SurvivorBrain(g, a, offset);
        this.brains.set(a.id, b);
      }
      if (!a.alive) {
        a.input.moveDir = null;
        a.input.repairTarget = null;
        continue;
      }
      b.update();
    }
    this.shareSightings();
    this.lastUpdateMs = Date.now() - t0;
  }

  /**
   * Teammates' shouts: a survivor bot that saw the killer this tick tells survivor bots within hearing range
   * where it was (they remember it as a "shout", a rough position, and react after their own reaction time).
   */
  private shareSightings(): void {
    const g = this.game;
    const k = g.killer;
    if (!k) return;
    const range = config().bots.hearingBlocks;
    for (const a of g.actors) {
      if (!a.isBot || !a.alive || !a.isSurvivor || a.isMinion) continue;
      const s = this.brains.get(a.id)?.mem.get(k.id);
      if (!s || s.how !== "sight" || s.tick !== g.now) continue;
      for (const o of g.actors) {
        if (o === a || !o.isBot || !o.alive || !o.isSurvivor || o.isMinion || dist2D(o.pos, a.pos) > range) continue;
        const ob = this.brains.get(o.id);
        if (ob && !ob.mem.recent(k.id, g.now, 5)) ob.mem.note({ id: k.id, pos: { ...s.pos }, tick: g.now, how: "shout" });
      }
    }
  }
}

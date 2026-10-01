// Survivor bot: ASSESS → GO_TO_GENERATOR → REPAIR → EVADE/LOOP → USE_ABILITY → HEAL/ASSIST → HIDE → SPECTATE.
import { Brain } from "./brain";
import type { Actor } from "../entities/actor";
import type { Game } from "../core/game";
import type { Generator } from "../world/generators";
import { config } from "../core/config";
import { ticks } from "../core/scale";
import { dist2D, type Vec3 } from "../util/vec";
import { heldItem, useHeldItem } from "../world/items";
import { botHooks, type SurvivorView } from "./hooks";

/**
 * Killer distance fields shared by all survivor bots. Each bot flees from where it *remembers* the killer
 * (terror-radius guesses are jittered), so fields are keyed by a 2×2-cell bucket of that position and kept
 * for 10 ticks; a handful of slots covers every bot's belief with one Dijkstra each.
 */
const FIELD_SLOTS = 4;
const FIELD_TICKS = 10;
const FIELD_RANGE = 32;
interface FieldSlot {
  game: Game | null;
  key: number;
  tick: number;
  field: Float32Array | null;
}
const fieldSlots: FieldSlot[] = Array.from({ length: FIELD_SLOTS }, () => ({ game: null, key: -1, tick: -1e9, field: null }));
function killerField(g: Game, kpos: Vec3): Float32Array {
  const c = g.grid.toGrid(kpos);
  const bx = Math.max(0, Math.min(g.grid.size - 1, c.x)) >> 1;
  const bz = Math.max(0, Math.min(g.grid.size - 1, c.z)) >> 1;
  const key = bx * 1024 + bz;
  let oldest = fieldSlots[0];
  for (const s of fieldSlots) {
    if (s.game === g && s.key === key && g.now - s.tick < FIELD_TICKS && s.field) return s.field;
    // Evict slots from another game first (tick values are not comparable across games), then the oldest.
    const age = (x: FieldSlot) => (x.game !== g ? Infinity : g.now - x.tick);
    if (age(s) > age(oldest)) oldest = s;
  }
  // Budget: at most one new field per game tick. Over budget, reuse this game's freshest field whose
  // bucket is within 3 buckets (a slightly wrong killer position is fine for picking a flee spot).
  if (lastFieldTick.game === g && lastFieldTick.tick === g.now) {
    let near: FieldSlot | null = null;
    for (const s of fieldSlots) {
      if (s.game !== g || !s.field || g.now - s.tick >= FIELD_TICKS * 2) continue;
      if (Math.abs((s.key >> 10) - bx) <= 3 && Math.abs((s.key & 1023) - bz) <= 3 && (!near || s.tick > near.tick)) near = s;
    }
    if (near?.field) return near.field;
  }
  lastFieldTick.game = g;
  lastFieldTick.tick = g.now;
  oldest.game = g;
  oldest.key = key;
  oldest.tick = g.now;
  oldest.field = g.grid.distanceField([{ x: bx * 2, z: bz * 2 }], FIELD_RANGE, oldest.field ?? undefined);
  return oldest.field;
}
const lastFieldTick: { game: Game | null; tick: number } = { game: null, tick: -1 };

/** Survivor abilities with long, non-attacking casts that a bot may cancel to run away. */
const LONG_CASTS = new Set(["sentry", "dispenser", "vandalism", "ritual", "c00lgui", "pray"]);

export class SurvivorBrain extends Brain {
  private genId: string | null = null;
  private evadeGoal: Vec3 | null = null;
  private evadeScore = -Infinity;
  private lastHitTick = -1000;
  private hpSeen: number;
  private fleeing = false;

  constructor(game: Game, me: Actor, offset: number) {
    super(game, me, offset);
    this.hpSeen = me.hp;
  }

  protected think(): void {
    const g = this.game;
    const me = this.me;
    const now = g.now;
    if (me.hp < this.hpSeen - 0.5) this.lastHitTick = now;
    this.hpSeen = me.hp;
    const killer = g.killer;
    const memTicks = ticks(config().bots.memorySeconds);
    const ks = killer ? this.mem.recent(killer.id, now, memTicks) : undefined;
    const threatDist = ks ? dist2D(me.pos, ks.pos) : Infinity;
    const recentlyHit = now - this.lastHitTick < 60;
    const threatKnown = !!ks && (this.reacted(killer!.id) || recentlyHit);
    if (!ks && killer) this.forgetNotice(killer.id);
    // Hysteresis: once fleeing, keep fleeing until the threat is clearly further away (no flip-flopping at the edge).
    const enter = ks?.how === "terror" ? 12 : 16;
    const danger = threatKnown && (threatDist < (this.fleeing ? enter + 6 : enter) || recentlyHit);
    this.fleeing = danger;

    const view: SurvivorView = {
      game: g,
      me,
      brain: this,
      killer: killer && killer.alive ? killer : null,
      killerSeen: ks ?? null,
      threatDist,
      danger,
      chased: danger && threatDist < 10,
      recentlyHit,
    };

    // A long self-cast (building, spraying, carving a ritual) is abandoned when the killer shows up.
    if (danger && me.channel && !me.forced && me.channel.endTick - now > 10 && LONG_CASTS.has(me.channel.abilityId ?? "")) g.interrupt(me, "manual");
    // Character hooks first (stuns, heals, escapes).
    botHooks(me.character.id).survivor?.(view);
    if (me.channel || me.forced) {
      this.state = "USE_ABILITY"; // committed to a windup / dash
      return;
    }

    // Map items.
    const item = heldItem(me);
    if (item === "medkit" && !danger && this.hpFrac() < 0.55) useHeldItem(g, me);
    if (item === "cola" && view.chased && me.statuses.level("speed") === 0) useHeldItem(g, me);

    if (danger) {
      this.evade(view);
      return;
    }
    this.evadeGoal = null;
    this.evadeScore = -Infinity;

    // Heal at a dispenser / pizza when hurt.
    if (this.hpFrac() < 0.5) {
      const heal = this.nearestHealing();
      if (heal && dist2D(me.pos, heal) < 25) {
        this.state = "HEAL";
        me.input.repairTarget = null;
        this.goal = heal;
        this.sprint = false;
        return;
      }
    }
    // Pick up items on the way.
    if (!item) {
      const it = g.objectsOf("map_item").find((o) => dist2D(o.pos, me.pos) < 14);
      if (it) {
        this.state = "PICKUP";
        me.input.repairTarget = null;
        this.goal = it.pos;
        this.sprint = false;
        return;
      }
    }
    this.generatorWork(view);
  }

  private generatorWork(view: SurvivorView): void {
    const g = this.game;
    const me = this.me;
    let gen = this.genId ? g.generators.find((x) => x.id === this.genId && !x.completed) : undefined;
    if (!gen || (gen.repairers.size >= 3 && !gen.repairers.has(me.id))) gen = this.chooseGenerator(view);
    if (!gen) {
      // Everything is repaired: hide near a loop far from the killer.
      this.state = "HIDE";
      me.input.repairTarget = null;
      if (!this.goal || dist2D(this.goal, me.pos) < 1) this.goal = g.grid.toWorld(g.rng.pick(g.layout.itemSpots));
      this.sprint = false;
      return;
    }
    this.genId = gen.id;
    const center = { x: gen.block.x + 0.5, y: gen.block.y, z: gen.block.z + 0.5 };
    const d = dist2D(me.pos, center);
    if (d <= config().match.repairRangeBlocks - 0.6) {
      this.state = "REPAIR";
      this.goal = null;
      this.aim(center);
      me.input.repairTarget = gen.id;
    } else {
      this.state = "GO_TO_GENERATOR";
      me.input.repairTarget = null;
      this.goal = this.standSpot(gen);
      this.arrive = 0.5;
      this.sprint = d > 12 && me.stamina > 60;
    }
  }

  /** Nearest walkable cell next to a generator, preferring unoccupied sides. */
  private standSpot(gen: Generator): Vec3 {
    const g = this.game;
    const sides = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const taken = [...gen.repairers].map((id) => g.get(id)).filter(Boolean) as Actor[];
    let best: Vec3 | null = null;
    let bd = Infinity;
    for (const [dx, dz] of sides) {
      const cx = gen.cell.x + dx;
      const cz = gen.cell.z + dz;
      if (!g.grid.walkable(cx, cz)) continue;
      const p = g.grid.toWorld({ x: cx, z: cz });
      if (taken.some((t) => t !== this.me && dist2D(t.pos, p) < 0.8)) continue;
      const d = dist2D(this.me.pos, p);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best ?? g.grid.toWorld(g.grid.nearestWalkable(gen.cell, 3) ?? gen.cell);
  }

  private chooseGenerator(view: SurvivorView): Generator | undefined {
    const g = this.game;
    const me = this.me;
    let best: Generator | undefined;
    let bestScore = Infinity;
    for (const gen of g.generators) {
      if (gen.completed) continue;
      const c = { x: gen.block.x + 0.5, y: gen.block.y, z: gen.block.z + 0.5 };
      const crowd = [...gen.repairers].filter((id) => id !== me.id).length;
      if (crowd >= 3) continue;
      let score = dist2D(me.pos, c) + crowd * 12 - gen.progress * 3;
      if (view.killerSeen) score += Math.max(0, 30 - dist2D(view.killerSeen.pos, c)) * 1.5;
      // Hallucinating survivors are worse at spotting fake generators.
      if (gen.fake && me.statuses.level("hallucination") === 0 && g.rng.chance(0.3)) score += 20;
      if (score < bestScore) {
        bestScore = score;
        best = gen;
      }
    }
    return best;
  }

  private nearestHealing(): Vec3 | null {
    const g = this.game;
    const me = this.me;
    if (me.character.id === "veeronica") return null; // Metal Frame
    let best: Vec3 | null = null;
    let bd = Infinity;
    for (const o of g.objects) {
      if (o.dead || (o.kind !== "pizza" && o.kind !== "dispenser")) continue;
      if (o.kind === "pizza" && o.owner === me) continue;
      const d = dist2D(o.pos, me.pos);
      if (d < bd) {
        bd = d;
        best = o.pos;
      }
    }
    return best;
  }

  /** Flee using distance fields: maximise (killer's path length − mine) away from dead ends. */
  private evade(view: SurvivorView): void {
    const g = this.game;
    const me = this.me;
    this.state = view.threatDist < 6 ? "LOOP" : "EVADE";
    me.input.repairTarget = null;
    const kpos = view.killerSeen!.pos;
    const grid = g.grid;
    const kf = killerField(g, kpos);
    const q = this.tuning.escapeQuality;
    const myCell = grid.toGrid(me.pos);
    // Score random nearby cells by (killer's path length − mine), openness and dead ends; keep the top few.
    const top: Array<{ p: Vec3; score: number }> = [];
    for (let i = 0; i < 60; i++) {
      const cx = myCell.x + Math.round((g.rng.next() - 0.5) * 36);
      const cz = myCell.z + Math.round((g.rng.next() - 0.5) * 36);
      if (!grid.walkable(cx, cz)) continue;
      const idx = grid.idx(cx, cz);
      const wp = grid.toWorld({ x: cx, z: cz });
      // Beyond the field's range the killer's path length is at least the range (and at least straight-line).
      const dk = kf[idx] !== Infinity ? kf[idx] : Math.max(FIELD_RANGE, dist2D(kpos, wp));
      // My distance: straight line, ×1.6 if I cannot walk there directly (cheaper than a field per bot).
      const dm = dist2D(me.pos, wp) * (grid.walkLine(me.pos, wp) ? 1 : 1.6);
      const open = grid.openness(cx, cz);
      let score = dk - dm * 0.7 + open * 0.6;
      if (open <= 3) score -= 6; // dead end
      score += (g.rng.next() - 0.5) * 12 * (1 - q);
      top.push({ p: wp, score });
    }
    top.sort((a, b) => b.score - a.score);
    // Breaking line of sight loses the killer (it only remembers for a few seconds): check the best few.
    const eyeK = { x: kpos.x, y: kpos.y + 1.6, z: kpos.z };
    let best: Vec3 | null = null;
    let bestScore = -Infinity;
    for (let i = 0; i < Math.min(4, top.length); i++) {
      const c = top[i];
      const hidden = !g.lineOfSight(eyeK, { x: c.p.x, y: c.p.y + 1.6, z: c.p.z });
      const score = c.score + (hidden ? 5 * q : 0);
      if (score > bestScore) {
        bestScore = score;
        best = c.p;
      }
    }
    // Hysteresis: keep the current flee goal unless the new one is clearly better.
    if (best && (!this.evadeGoal || bestScore > this.evadeScore + 2 || dist2D(me.pos, this.evadeGoal) < 1.5)) {
      this.evadeGoal = best;
      this.evadeScore = bestScore;
    }
    this.goal = this.evadeGoal ?? best;
    this.arrive = 0.8;
    // Save stamina while the killer is far and not in sight; sprint when it counts.
    this.sprint = (me.stamina > 20 && (view.threatDist < 11 || view.killerSeen!.how === "sight")) || view.threatDist < 6;
  }
}

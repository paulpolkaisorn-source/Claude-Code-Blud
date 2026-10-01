// Killer bot: PATROL → SEARCH → CHASE → ABILITY → FINISH → RESET (brief §5.4).
import { Brain } from "./brain";
import type { Actor } from "../entities/actor";
import type { Game } from "../core/game";
import type { Sighting } from "./perception";
import { meleeReach, ticks } from "../core/scale";
import { dist2D, type Vec3 } from "../util/vec";
import { botHooks, type KillerView } from "./hooks";

export class KillerBrain extends Brain {
  private targetId: string | null = null;
  private chaseStart = 0;
  private lastDamageTick = 0;
  private ignored = new Map<string, number>();
  private patrolGoal: Vec3 | null = null;
  private dealtSeen = 0;
  private searchUntil = 0;

  constructor(game: Game, me: Actor, offset: number) {
    super(game, me, offset);
    game.listeners.onKill.push((victim) => {
      if (victim.id === this.targetId) this.reset();
    });
  }

  private reset(): void {
    this.state = "RESET";
    this.targetId = null;
    this.patrolGoal = null;
  }

  protected think(): void {
    const g = this.game;
    const me = this.me;
    const now = g.now;
    if (me.stats.damageDealt > this.dealtSeen + 0.5) {
      this.dealtSeen = me.stats.damageDealt;
      this.lastDamageTick = now;
    }
    const memTicks = ticks(this.tuning.killerMemorySeconds);
    const known = this.knownTargets(memTicks);
    let target = this.targetId ? g.get(this.targetId) : undefined;
    let sight = target ? known.find((k) => k.id === target!.id) : undefined;
    // Chase persistence limit (no tunneling): give up on a fruitless chase.
    const giveUp = ticks(this.tuning.chaseGiveUpSeconds);
    // Gives up when the chase has gone on too long without landing a hit (even with no other survivor known:
    // it then patrols and listens instead of tunnelling).
    if (target && sight && now - this.chaseStart > giveUp && now - this.lastDamageTick > giveUp) {
      this.ignored.set(target.id, now + ticks(10));
      target = undefined;
      sight = undefined;
    }
    if (!target || !target.alive || !sight) {
      const pick = this.pickTarget(known);
      if (pick) {
        target = g.get(pick.id);
        sight = pick;
        this.targetId = pick.id;
        this.chaseStart = now;
        this.lastDamageTick = Math.max(this.lastDamageTick, now);
      } else {
        target = undefined;
        this.targetId = null;
      }
    }

    const view: KillerView = {
      game: g,
      me,
      brain: this,
      target: target && sight ? target : null,
      targetSeen: sight ?? null,
      targetDist: target && sight ? dist2D(me.pos, sight.pos) : Infinity,
      known,
      chaseSeconds: (now - this.chaseStart) / 20,
    };
    botHooks(me.character.id).killer?.(view);
    if (me.channel || me.forced) return;

    if (view.target && view.targetSeen) {
      this.chase(view);
      return;
    }
    // Investigate the freshest noise (generators being repaired are loud), then patrol.
    const noise = this.mem.noises.filter((n) => now - n.tick < ticks(6)).pop();
    if (noise) {
      this.state = "SEARCH";
      this.goal = noise.pos;
      this.sprint = me.stamina > 50;
      this.searchUntil = now + ticks(6);
      return;
    }
    if (now < this.searchUntil && this.goal) return;
    this.patrol();
  }

  private knownTargets(memTicks: number): Sighting[] {
    const g = this.game;
    const now = g.now;
    const out: Sighting[] = [];
    for (const t of g.enemiesOf(this.me, true)) {
      if ((this.ignored.get(t.id) ?? 0) > now) continue;
      const s = this.mem.recent(t.id, now, memTicks);
      if (s) out.push(s);
    }
    return out;
  }

  private pickTarget(known: Sighting[]): Sighting | null {
    const g = this.game;
    let best: Sighting | null = null;
    let bestScore = Infinity;
    for (const s of known) {
      const t = g.get(s.id);
      if (!t || !t.alive) continue;
      const allies = g.aliveSurvivors().filter((o) => o !== t && dist2D(o.pos, s.pos) < 10).length;
      let score = dist2D(this.me.pos, s.pos) + allies * 6;
      if (t.hp < t.maxHp * 0.5) score -= 6;
      if (t.exhausted) score -= 4;
      if (s.how === "sight") score -= 5;
      if (s.how === "terror" || s.how === "sound") score += 6;
      if (score < bestScore) {
        bestScore = score;
        best = s;
      }
    }
    return best;
  }

  private chase(view: KillerView): void {
    const me = this.me;
    const t = view.target!;
    const s = view.targetSeen!;
    const d = view.targetDist;
    this.state = t.hp < t.maxHp * 0.35 ? "FINISH" : "CHASE";
    // Lead the target slightly when we can see it.
    const lead = s.how === "sight" ? 0.5 : 0;
    const vx = (t.pos.x - t.lastPos.x) * 20 * lead;
    const vz = (t.pos.z - t.lastPos.z) * 20 * lead;
    this.goal = { x: s.pos.x + vx, y: s.pos.y, z: s.pos.z + vz };
    this.arrive = 0.9;
    this.sprint = d > 3 && (me.stamina > 25 || d < 8);
    // Basic attack when in reach and in front.
    const main = me.character.abilities.find((a) => a.slot === 1);
    if (main && s.how !== "terror") {
      const reach = meleeReach((main.params.rangeStuds as number | undefined) ?? 7);
      // swingChance models human timing: lower difficulties hesitate or swing late.
      if (d <= reach + 0.3 && this.game.rng.chance(this.tuning.swingChance) && this.game.lineOfSight({ ...me.pos, y: me.pos.y + 1.6 }, { ...t.pos, y: t.pos.y + 1.6 })) {
        if (this.use(main.id, t, true)) this.markSwing();
      }
    }
  }

  private markSwing(): void {
    const body = this.me.body as unknown as { actionUntil?: number };
    if (typeof body.actionUntil === "number") body.actionUntil = this.game.now + 8;
  }

  /** Patrol generator clusters weighted by repair progress. */
  private patrol(): void {
    const g = this.game;
    const me = this.me;
    this.state = "PATROL";
    if (!this.patrolGoal || dist2D(me.pos, this.patrolGoal) < 2) {
      const gens = g.generators.filter((x) => !x.completed);
      if (gens.length) {
        const weights = gens.map((x) => 1 + x.progress * 2 + x.repairers.size * 3);
        const pick = gens[g.rng.weighted(weights)];
        this.patrolGoal = g.grid.toWorld(g.grid.nearestWalkable({ x: pick.cell.x + g.rng.int(-3, 3), z: pick.cell.z + g.rng.int(-3, 3) }, 4) ?? pick.cell);
      } else {
        this.patrolGoal = g.grid.toWorld(g.rng.pick([...g.layout.itemSpots, ...g.layout.survivorSpawns]));
      }
    }
    this.goal = this.patrolGoal;
    this.arrive = 1.2;
    this.sprint = false;
  }
}

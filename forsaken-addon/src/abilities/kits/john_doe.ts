// John Doe (wiki, 2026-10-01): Natural Malevolence trail + contact damage, Unstoppable, Slash,
// Corrupt Energy (spike wall + retract), Digital Footprint (shadow traps), 404 Error.
import { cooldownFor, type AbilityCtx, type Kit } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import type { WorldObject } from "../objects";
import { ACTOR_RADIUS } from "../hit";
import { basicAttack, blocks } from "./common";
import { statusDef, type StatusId } from "../../entities/statuses";
import { ticks } from "../../core/scale";
import { add, dist2D, flat, scale, sub, type Vec3 } from "../../util/vec";

/** Abilities whose cast triggers Unstoppable when John is stunned (Digital Footprint does not). */
const UNSTOPPABLE_ABILITIES = new Set(["corrupt_energy", "error_404"]);
/** Distance between two trail segments (blocks). */
const TRAIL_SPACING = 0.6;
/** Horizontal distance (blocks, center to center) that counts as touching John. */
const CONTACT = ACTOR_RADIUS * 2 + 0.3;

type TrailData = {
  last?: Vec3;
  segs?: WorldObject[];
  /** survivor id → tick when contact damage may hit again. */
  contactReady?: Record<string, number>;
};

type CeData = {
  /** Spikes of the current wall (alive or not). */
  spikes?: WorldObject[];
  erupting?: boolean;
  eruptStartTick?: number;
  spawned?: number;
  acc?: number;
  cursor?: Vec3 | null;
  hits?: Record<string, { count: number; last: number }>;
  retractReadyTick?: number;
};

type UnstoppableData = {
  pending?: string | null;
  boostEndTick?: number;
};

function passive(a: Actor, id: string): Record<string, number> {
  return a.character.passives.find((p) => p.id === id)!.params as Record<string, number>;
}

function params(a: Actor, abilityId: string): Record<string, number> {
  return a.ability(abilityId)!.params as Record<string, number>;
}

function aim(a: Actor): Vec3 {
  const f = flat(a.facing);
  return f.x === 0 && f.z === 0 ? { x: 0, y: 0, z: 1 } : f;
}

/** No other cast while a windup is in progress. */
function idle(ctx: AbilityCtx): true | string {
  return ctx.actor.channel ? "busy" : true;
}

function touching(t: Actor, p: Vec3, radius: number): boolean {
  return dist2D(t.pos, p) <= radius && Math.abs(t.pos.y - p.y) <= 1.5;
}

/** Applies a status while standing in something, refreshing only when the timer has run down a bit. */
function standStatus(game: Game, t: Actor, id: StatusId, level: number, seconds: number, src: Actor): void {
  const cur = t.statuses.get(id);
  if (cur && cur.level >= level && t.statuses.remainingTicks(id, game.now) > ticks(seconds) - 5) return;
  game.status(t, id, level, seconds, src, { mode: "max" });
}

/** The ability John is casting right now, if it can trigger Unstoppable. */
export function unstoppableCast(a: Actor): string | null {
  const ch = a.channel?.abilityId;
  if (ch && UNSTOPPABLE_ABILITIES.has(ch)) return ch;
  if (a.data<CeData>("corrupt_energy").erupting) return "corrupt_energy";
  return null;
}

// ------------------------------------------------------------------ Natural Malevolence

function trailTick(a: Actor, game: Game): void {
  const nm = passive(a, "natural_malevolence");
  const d = a.data<TrailData>("natural_malevolence");
  if (!d.segs) d.segs = [];
  if (!d.last) d.last = { ...a.pos };
  const moved = dist2D(a.pos, d.last);
  if (moved > TRAIL_SPACING * 8) {
    // Teleported: start a new trail here.
    d.last = { ...a.pos };
  } else if (moved >= TRAIL_SPACING) {
    // Fill the path walked since the last segment, one segment every 0.6 blocks.
    const steps = Math.floor(moved / TRAIL_SPACING);
    const dir = flat(sub(a.pos, d.last));
    for (let i = 0; i < steps; i++) {
      const p = add(d.last, scale(dir, TRAIL_SPACING * i));
      d.segs.push(spawnTrailSegment(a, game, { x: p.x, y: a.pos.y, z: p.z }, nm));
    }
    const next = add(d.last, scale(dir, TRAIL_SPACING * steps));
    d.last = { x: next.x, y: a.pos.y, z: next.z };
  }
  // The trail is 48 studs long; past that it closes in from the oldest end.
  const maxSegs = Math.max(1, Math.round(blocks(nm.trailStuds) / TRAIL_SPACING));
  d.segs = d.segs.filter((o) => !o.dead);
  while (d.segs.length > maxSegs) game.removeObject(d.segs.shift()!, "expired");
}

function spawnTrailSegment(a: Actor, game: Game, pos: Vec3, nm: Record<string, number>): WorldObject {
  return game.spawnObject({
    kind: "jd_trail",
    owner: a,
    pos,
    radius: TRAIL_SPACING,
    lifeSeconds: nm.trailLifeSeconds,
    update(o, g) {
      if ((g.now + Number(o.id.slice(3))) % 8 === 0) g.fx.particle("corruption", add(o.pos, { x: 0, y: 0.1, z: 0 }));
      for (const s of g.aliveSurvivors()) {
        // Dusekkar levitates over the trail.
        if (s.character.id === "dusekkar") continue;
        if (touching(s, o.pos, o.radius)) standStatus(g, s, "corrupted", nm.corruptLevel, nm.corruptSeconds, a);
      }
    },
  });
}

function contactTick(a: Actor, game: Game): void {
  const nm = passive(a, "natural_malevolence");
  const d = a.data<TrailData>("natural_malevolence");
  if (!d.contactReady) d.contactReady = {};
  for (const s of game.aliveSurvivors()) {
    if (!touching(s, a.pos, CONTACT)) continue;
    if (game.now < (d.contactReady[s.id] ?? 0)) continue;
    d.contactReady[s.id] = game.now + ticks(nm.contactCooldown);
    game.damage(s, nm.contactDamage, a, { kind: "ability", abilityId: "natural_malevolence", tags: ["contact"] });
    game.fx.particle("corruption", add(s.pos, { x: 0, y: 1, z: 0 }));
  }
}

// ------------------------------------------------------------------ Corrupt Energy

function ceData(a: Actor): CeData {
  return a.data<CeData>("corrupt_energy");
}

function liveSpikes(a: Actor): WorldObject[] {
  return (ceData(a).spikes ?? []).filter((o) => !o.dead);
}

function retract(game: Game, a: Actor): void {
  const d = ceData(a);
  d.erupting = false;
  for (const o of liveSpikes(a)) game.removeObject(o, "cleanup");
  d.spikes = [];
  game.fx.sound("glitch", a.pos);
}

function stopEruption(a: Actor, game: Game): void {
  const d = ceData(a);
  if (!d.erupting) return;
  d.erupting = false;
  d.retractReadyTick = game.now + ticks(params(a, "corrupt_energy").retractCooldown);
}

function startEruption(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const d = ctx.data as CeData;
  // A previous wall that is still standing sinks when a new one rises.
  for (const o of liveSpikes(actor)) game.removeObject(o, "cleanup");
  d.spikes = [];
  d.erupting = true;
  d.eruptStartTick = game.now + Math.max(1, ticks(ctx.n("activateDelay")));
  d.spawned = 0;
  d.acc = 0;
  d.cursor = null;
  d.hits = {};
  d.retractReadyTick = Infinity;
  game.fx.sound("explosion", actor.pos);
  game.fx.particle("corruption", add(actor.pos, { x: 0, y: 0.2, z: 0 }));
}

/** Spikes rise one after another along John's current facing, so the wall follows his camera. */
function eruptionTick(a: Actor, game: Game): void {
  const d = ceData(a);
  if (!d.erupting) return;
  if (a.isStunned(game.now)) {
    stopEruption(a, game);
    return;
  }
  if (game.now < (d.eruptStartTick ?? 0)) return;
  const p = params(a, "corrupt_energy");
  const total = p.spikes;
  const spacing = blocks(p.wallLengthStuds) / total;
  d.acc = (d.acc ?? 0) + total / Math.max(1, ticks(p.eruptSeconds));
  while ((d.acc ?? 0) >= 1 && (d.spawned ?? 0) < total) {
    d.acc = (d.acc ?? 0) - 1;
    const dir = aim(a);
    const next = d.cursor ? add(d.cursor, scale(dir, spacing)) : add(a.pos, scale(dir, 1));
    const cx = Math.floor(next.x - game.grid.originX);
    const cz = Math.floor(next.z - game.grid.originZ);
    if (game.grid.blocksProjectile(cx, cz, 0.5)) {
      // The wall stops at real walls and obstacles.
      d.spawned = total;
      break;
    }
    d.cursor = { x: next.x, y: a.pos.y, z: next.z };
    d.spikes = d.spikes ?? [];
    d.spikes.push(spawnSpike(a, game, d.cursor, p));
    d.spawned = (d.spawned ?? 0) + 1;
  }
  if ((d.spawned ?? 0) >= total) stopEruption(a, game);
}

/** Spike hit: 11 damage and Speed I 7 s for John; at most 2 hits per survivor per wall (0.5 s apart). */
function trySpikeHit(a: Actor, game: Game, t: Actor, p: Record<string, number>): void {
  const d = ceData(a);
  const hits = d.hits ?? (d.hits = {});
  const h = hits[t.id] ?? (hits[t.id] = { count: 0, last: -Infinity });
  if (h.count >= p.maxHitsPerSurvivor || game.now - h.last < ticks(p.rehitSeconds)) return;
  const ev = game.damage(t, p.damage, a, { kind: "ability", abilityId: "corrupt_energy", tags: ["aoe"] });
  if (ev.cancelled) return;
  h.count++;
  h.last = game.now;
  game.status(a, "speed", p.selfSpeedLevel, p.selfSpeedSeconds, a);
}

function spawnSpike(a: Actor, game: Game, pos: Vec3, p: Record<string, number>): WorldObject {
  const radius = blocks(p.spikeRadiusStuds);
  const reach = radius + ACTOR_RADIUS;
  const o = game.spawnObject({
    kind: "jd_spike",
    owner: a,
    pos: { ...pos },
    radius,
    lifeSeconds: p.spikeLifeSeconds,
    prop: "spike",
    // Bots path around the wall.
    blockCells: [game.grid.toGrid(pos)],
    update(obj, g) {
      // Props are not solid in Minecraft: walking into the wall hurts (same 2-hit cap) and standing on it corrupts.
      for (const t of g.enemiesOf(a)) if (touching(t, obj.pos, reach)) trySpikeHit(a, g, t, p);
      for (const s of g.aliveSurvivors()) if (touching(s, obj.pos, reach)) standStatus(g, s, "corrupted", p.standCorruptLevel, p.standCorruptSeconds, a);
    },
  });
  game.fx.particle("corruption", add(pos, { x: 0, y: 0.6, z: 0 }));
  // The erupting spike strikes whoever stands there.
  for (const t of game.enemiesOf(a)) if (touching(t, pos, reach)) trySpikeHit(a, game, t, p);
  return o;
}

// ------------------------------------------------------------------ Digital Footprint

function placeTrap(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const traps = game.objectsOf("shadow_trap", actor);
  // Max 3: the oldest trap sinks when a fourth is made.
  while (traps.length >= ctx.n("maxTraps")) game.removeObject(traps.shift()!, "cleanup");
  const pos = { ...actor.pos };
  const r = blocks(ctx.n("radiusStuds"));
  const hearRange = blocks(ctx.n("hearRangeStuds"));
  const hear = game.actors.filter((x) => !x.isMinion && dist2D(x.pos, pos) <= hearRange).map((x) => x.id);
  game.fx.sound("trap", pos, { to: hear });
  game.spawnObject({
    kind: "shadow_trap",
    owner: actor,
    pos,
    radius: r,
    update(o, g) {
      // Invisible to survivors; permanently highlighted to John only.
      if (g.now % 10 === 0) g.fx.ring("corruption", add(o.pos, { x: 0, y: 0.15, z: 0 }), r, 18, { viewers: [actor.id] });
      for (const s of g.aliveSurvivors()) {
        if (!touching(s, o.pos, r)) continue;
        triggerTrap(ctx, s, o);
        return;
      }
    },
  });
}

function triggerTrap(ctx: AbilityCtx, s: Actor, o: WorldObject): void {
  const { game, actor } = ctx;
  game.removeObject(o, "consumed");
  game.status(actor, "speed", ctx.n("selfSpeedLevel"), ctx.n("selfSpeedSeconds"), actor);
  game.status(s, "slowness", ctx.n("slowLevel"), ctx.n("debuffSeconds"), actor);
  game.status(s, "corrupted", ctx.n("corruptLevel"), ctx.n("debuffSeconds"), actor);
  // Both see each other.
  game.reveal(s, [actor.id], ctx.n("mutualRevealSeconds"), { color: "red", source: "digital_footprint" });
  if (actor.alive) game.reveal(actor, [s.id], ctx.n("mutualRevealSeconds"), { color: "red", source: "digital_footprint" });
  game.fx.sound("glitch", o.pos);
  game.fx.particle("corruption", add(o.pos, { x: 0, y: 0.5, z: 0 }));
  game.fx.flash([s.id], "§4You stepped on a shadow trap!");
  game.fx.flash([actor.id], `§c${s.displayName} triggered a shadow trap`);
}

// ------------------------------------------------------------------ kit

export const johnDoeKit: Kit = {
  id: "john_doe",
  init(a) {
    const u = passive(a, "unstoppable");
    a.addHooks("unstoppable", {
      modifyStun(self, seconds) {
        const cast = unstoppableCast(self);
        if (!cast) return seconds;
        self.data<UnstoppableData>("unstoppable").pending = cast;
        return Math.min(seconds, u.stunCap);
      },
      afterStunned(self, seconds, _src, g) {
        const ud = self.data<UnstoppableData>("unstoppable");
        const cast = ud.pending;
        stopEruption(self, g);
        if (!cast) return;
        ud.pending = null;
        // The interrupted ability's cooldown is cut in half.
        const def = self.ability(cast);
        if (def) g.startCooldown(self, cast, cooldownFor(g, self, def) * u.cooldownCut);
        g.fx.flash([self.id], "§4UNSTOPPABLE");
        g.schedule(self, seconds, () => {
          if (!self.alive) return;
          const secs = u.speedSeconds + u.perSentinelSeconds * g.aliveSentinels();
          g.status(self, "speed", u.speedLevel, secs, self);
          ud.boostEndTick = g.now + ticks(secs);
          g.fx.sound("roar", self.pos);
          g.fx.particle("roar", add(self.pos, { x: 0, y: 1, z: 0 }));
        });
      },
      modifyStatus(self, id, change, _src, g) {
        const ud = self.data<UnstoppableData>("unstoppable");
        if (g.now < (ud.boostEndTick ?? 0) && statusDef(id).kind === "debuff") return { level: change.level, seconds: change.seconds / 2 };
        return change;
      },
    });
  },
  tick(a, game) {
    trailTick(a, game);
    contactTick(a, game);
    eruptionTick(a, game);
  },
  abilities: {
    slash: {
      can: idle,
      use(ctx) {
        basicAttack(ctx, ctx.n("damage"));
      },
    },
    corrupt_energy: {
      can: idle,
      // Second press retracts the wall (available 4.5 s after the spikes finished rising).
      isActive(ctx) {
        const d = ctx.data as CeData;
        return !d.erupting && liveSpikes(ctx.actor).length > 0 && ctx.game.now >= (d.retractReadyTick ?? Infinity);
      },
      hud(ctx) {
        const d = ctx.data as CeData;
        if (d.erupting) return "§5RISING";
        if (liveSpikes(ctx.actor).length === 0) return null;
        const wait = ((d.retractReadyTick ?? 0) - ctx.game.now) / 20;
        return wait > 0 ? `retract ${wait.toFixed(1)}s` : "§dRETRACT";
      },
      use(ctx) {
        const { game, actor } = ctx;
        game.fx.sound("windup", actor.pos);
        game.windup(actor, ctx.n("windup"), () => startEruption(ctx), { abilityId: "corrupt_energy", label: ctx.def.name });
      },
      release(ctx) {
        retract(ctx.game, ctx.actor);
      },
    },
    digital_footprint: {
      can: idle,
      hud(ctx) {
        return `${ctx.game.objectsOf("shadow_trap", ctx.actor).length}/${ctx.n("maxTraps")}`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const stomp = ctx.n("stompSeconds");
        // Three stomps; the third creates the trap beneath him.
        game.fx.sound("trap", actor.pos);
        game.schedule(actor, stomp / 3, () => game.fx.sound("trap", actor.pos), { stunCancels: true });
        game.schedule(actor, (2 * stomp) / 3, () => game.fx.sound("trap", actor.pos), { stunCancels: true });
        game.windup(actor, stomp, () => placeTrap(ctx), { abilityId: "digital_footprint", label: ctx.def.name, frozen: true });
      },
    },
    error_404: {
      can: idle,
      use(ctx) {
        const { game, actor } = ctx;
        const w = ctx.n("windup");
        // The arm pulses twice; heavily slowed and no sprinting while casting.
        game.fx.sound("glitch", actor.pos);
        game.schedule(actor, w / 2, () => game.fx.sound("glitch", actor.pos), { stunCancels: true });
        game.windup(
          actor,
          w,
          () => {
            for (const s of game.aliveSurvivors()) game.reveal(s, [actor.id], ctx.n("revealSeconds"), { color: "red", source: "error_404" });
            game.fx.title([actor.id], "§4404", "§cSurvivors located", 30);
            game.fx.sound("zap", actor.pos);
          },
          { abilityId: "error_404", label: ctx.def.name, moveMul: ctx.n("selfMoveMul"), noSprint: true },
        );
      },
    },
  },
};

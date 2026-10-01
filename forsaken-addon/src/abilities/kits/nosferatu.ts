// Nosferatu (wiki, 2026-10-01): Levitation, Lacerate / Dive, Bloodhook, Cataclysm, Hunter's Feast, Ascension.
import { makeCtx, type AbilityCtx, type Kit } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import { spawnProjectile, type WorldObject } from "../objects";
import { ACTOR_RADIUS, eye } from "../hit";
import { basicAttack, blocks, enemiesInRadius, knockback, projSpeed, teleportSafe } from "./common";
import { blocksPerSecond, ticks } from "../../core/scale";
import { add, dist2D, flat, scale, sub, type Vec3 } from "../../util/vec";

type P = Record<string, number>;

function abilityParams(a: Actor, id: string): P {
  return a.ability(id)!.params as P;
}

function cooldownOf(a: Actor, id: string, fallback: number): number {
  return a.ability(id)?.cooldown ?? fallback;
}

export function inBatForm(a: Actor): boolean {
  return a.flags.has("batForm");
}

// ============================================================================ Hunter's Feast stealth

/** Hunter's Feast's Invisibility V + Undetectable end as soon as Nosferatu uses any ability. */
function breakFeast(game: Game, a: Actor): void {
  if (!a.flags.has("feastInvis")) return;
  a.flags.delete("feastInvis");
  game.removeStatus(a, "invisibility");
  game.removeStatus(a, "undetectable");
}

// ============================================================================ Ascension (bat form)

type AscensionData = { active?: boolean; endTick?: number; diving?: boolean };

/** Leaves bat form. `penalty`: exit without a dive (dismount or timeout) gives Slowness III + Helpless 4 s. */
export function endBatForm(game: Game, a: Actor, penalty: boolean): void {
  if (!inBatForm(a)) return;
  const p = abilityParams(a, "ascension");
  const d = a.data<AscensionData>("ascension");
  a.flags.delete("batForm");
  a.flags.delete("flying");
  a.removeMoveMod("ascension");
  game.removeStatus(a, "invincible");
  game.removeStatus(a, "stun_immune");
  // Stamina starts regenerating immediately on exit, however he exits.
  a.staminaFrozen = false;
  a.regenDelayTicks = 0;
  delete a.res.terrorMul;
  d.active = false;
  d.diving = false;
  game.startCooldown(a, "ascension", cooldownOf(a, "ascension", 32));
  if (penalty) {
    game.status(a, "slowness", p.timeoutSlowLevel, p.timeoutHelplessSeconds, a);
    game.status(a, "helpless", 1, p.timeoutHelplessSeconds, a);
  }
}

function tickBatForm(a: Actor, game: Game): void {
  if (!inBatForm(a)) return;
  const d = a.data<AscensionData>("ascension");
  // All survivors are highlighted while in bat form.
  for (const s of game.aliveSurvivors()) game.reveal(s, [a.id], 0.3, { color: "red", source: "ascension" });
  if (game.now % 4 === 0) game.fx.particle("bats", add(a.pos, { x: 0, y: 1, z: 0 }));
  if (!d.diving && game.now >= (d.endTick ?? 0)) endBatForm(game, a, true);
}

// ============================================================================ Dive (Lacerate in bat form)

function diveTarget(game: Game, a: Actor, radius: number): Actor | null {
  let best: Actor | null = null;
  let bd = Infinity;
  for (const t of game.enemiesOf(a)) {
    const d = dist2D(a.pos, t.pos);
    const dy = a.pos.y - t.pos.y;
    if (d > radius + ACTOR_RADIUS || dy < -1.5 || dy > 6) continue;
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best;
}

function dive(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const asc = actor.data<AscensionData>("ascension");
  asc.diving = true;
  game.fx.sound("bats", actor.pos, { volume: 3 }); // global cue
  game.windup(
    actor,
    ctx.n("diveWindup"),
    () => {
      const start = game.now;
      const airborne = !actor.state.onGround;
      let target: Actor | null = null;
      // Dives at an angle toward the camera direction.
      actor.body.impulse({ x: 0, y: Math.min(-0.3, actor.facing.y), z: 0 });
      game.dash(actor, {
        id: "dive",
        dir: actor.facing,
        studsPerSecond: ctx.n("diveStudsPerSecond"),
        seconds: ctx.n("diveMaxSeconds"),
        onTick: () => {
          target = diveTarget(game, actor, blocks(ctx.n("hitRadiusStuds")));
          if (target) return false;
          // Touching the ground after leaving the air ends the dive.
          if (airborne && game.now - start >= 6 && actor.state.onGround) return false;
        },
        onEnd: () => {
          const secs = (game.now - start) / 20;
          if (target && target.alive) diveHit(ctx, target, secs);
          else diveMiss(ctx);
        },
      });
    },
    {
      abilityId: "lacerate",
      label: "Dive",
      moveMul: 0.3,
      onCancel: () => {
        asc.diving = false;
      },
    },
  );
}

/** Toss damage scales with the dive time: 5 at once, 30 from 0.55 s of diving. */
export function diveTossDamage(p: P, diveSeconds: number): number {
  return p.tossBase + (p.tossMax - p.tossBase) * Math.max(0, Math.min(1, diveSeconds / p.tossMaxAt));
}

function diveHit(ctx: AbilityCtx, t: Actor, diveSeconds: number): void {
  const { game, actor } = ctx;
  // A landed dive ends the form without penalty.
  endBatForm(game, actor, false);
  const bite = game.damage(t, ctx.n("biteDamage"), actor, { kind: "basic", abilityId: "lacerate", tags: ["melee", "grab"] });
  game.fx.sound("bats", actor.pos, { volume: 3 });
  if (bite.cancelled || !t.alive) return;
  const pin = ctx.n("pinSeconds");
  t.addMoveMod({ id: "dive_pinned", endTick: game.now + ticks(pin), frozen: true });
  t.flags.add("grabbed");
  actor.addMoveMod({ id: "dive_pin", endTick: game.now + ticks(pin), frozen: true });
  game.status(actor, "invincible", 1, pin, actor);
  game.status(actor, "stun_immune", 1, pin + ctx.n("lingerStunImmuneSeconds"), actor);
  const toss = diveTossDamage(ctx.def.params as P, diveSeconds);
  game.schedule(actor, pin, () => {
    t.removeMoveMod("dive_pinned");
    t.flags.delete("grabbed");
    if (!t.alive) return;
    game.damage(t, toss, actor, { kind: "ability", abilityId: "lacerate", tags: ["grab"] });
    if (t.alive) knockback(t, actor.pos, blocks(ctx.n("tossStuds")), 0.5);
    game.fx.particle("blood", add(t.pos, { x: 0, y: 1.2, z: 0 }));
  });
}

function diveMiss(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  endBatForm(game, actor, false);
  game.damage(actor, ctx.n("missSelfDamage"), actor, { kind: "self", abilityId: "lacerate" });
  game.status(actor, "slowness", ctx.n("missSlowLevel"), ctx.n("missHelplessSeconds"), actor);
  game.status(actor, "helpless", 1, ctx.n("missHelplessSeconds"), actor);
  game.fx.particle("smoke", add(actor.pos, { x: 0, y: 0.5, z: 0 }));
}

// ============================================================================ Bloodhook

type TugState = { targetId: string; endTick: number; nextCheck: number; kStart: number; sStart: number; kLast: number; sLast: number; lead: boolean };
type HookData = { pending?: boolean; tug?: TugState | null };

function grab(t: Actor): void {
  t.addMoveMod({ id: "bloodhook_grab", endTick: Infinity, frozen: true });
  t.flags.add("grabbed");
}

function ungrab(game: Game, t: Actor): void {
  t.removeMoveMod("bloodhook_grab");
  t.flags.delete("grabbed");
  t.flags.delete("tugOfWar");
  if (t.forced && (t.forced.id === "bloodhook_pull" || t.forced.id === "bloodhook_drag")) game.endForced(t, "cancel");
}

/** After any landed pull: Helpless ~2 s and Slowness II ~1 s, then brief stun immunity. */
function landedPull(game: Game, a: Actor, p: P): void {
  a.removeMoveMod("bloodhook_hold");
  game.status(a, "helpless", 1, p.selfHelplessSeconds, a);
  game.status(a, "slowness", p.selfSlowLevel, p.selfSlowSeconds, a);
  game.status(a, "stun_immune", 1, p.lingerStunImmuneSeconds, a);
}

function hookMiss(ctx: AbilityCtx): void {
  const d = ctx.actor.data<HookData>("bloodhook");
  if (!d.pending) return;
  d.pending = false;
  ctx.game.startCooldown(ctx.actor, "bloodhook", ctx.n("missCooldown"));
}

function hookHit(ctx: AbilityCtx, o: WorldObject, t: Actor): void {
  const { game, actor } = ctx;
  const d = actor.data<HookData>("bloodhook");
  if (!d.pending) return;
  d.pending = false;
  const opts = { kind: "ability" as const, abilityId: "bloodhook", tags: ["projectile", "grab"] };
  // Can hit several survivors but grabs only one.
  for (const other of enemiesInRadius(game, actor, o.pos, 1.0, false)) if (other !== t) game.damage(other, ctx.n("damage"), actor, opts);
  const ev = game.damage(t, ctx.n("damage"), actor, opts);
  if (ev.cancelled) {
    game.startCooldown(actor, "bloodhook", ctx.n("missCooldown"));
    return;
  }
  game.startCooldown(actor, "bloodhook", ctx.def.cooldown ?? 24);
  game.fx.sound("chain", t.pos);
  if (!t.alive) return;
  actor.addMoveMod({ id: "bloodhook_hold", endTick: Infinity, frozen: true });
  grab(t);
  if (dist2D(actor.pos, t.pos) <= blocks(ctx.n("closeStuds"))) closeDrag(ctx, t);
  else startTug(ctx, t);
}

/** Close range: drag to Nosferatu and kick (+3), no tug-of-war. */
function closeDrag(ctx: AbilityCtx, t: Actor): void {
  const { game, actor } = ctx;
  const p = ctx.def.params as P;
  const finish = () => {
    ungrab(game, t);
    if (t.alive) {
      game.damage(t, ctx.n("closeKickDamage"), actor, { kind: "ability", abilityId: "bloodhook", tags: ["melee", "grab"] });
      if (t.alive) knockback(t, actor.pos, blocks(ctx.n("kickStuds")), 0.35);
    }
    landedPull(game, actor, p);
  };
  if (dist2D(t.pos, actor.pos) <= 1.4) {
    finish();
    return;
  }
  game.dash(t, {
    id: "bloodhook_drag",
    dir: flat(sub(actor.pos, t.pos)),
    studsPerSecond: ctx.n("dragStudsPerSecond"),
    seconds: dist2D(t.pos, actor.pos) / blocksPerSecond(ctx.n("dragStudsPerSecond")) + 0.25,
    stopOnStun: false,
    onTick: () => (dist2D(t.pos, actor.pos) <= 1.4 ? false : undefined),
    onEnd: finish,
  });
}

function tugPull(ctx: AbilityCtx, t: Actor): void {
  const { game, actor } = ctx;
  game.dash(t, {
    id: "bloodhook_pull",
    dir: flat(sub(actor.pos, t.pos)),
    studsPerSecond: ctx.n("pullStudsPerSecond"),
    seconds: ctx.n("tugWindowSeconds"),
    stopOnStun: false,
  });
}

/** Long range: tug-of-war. Both sides spam jump; every 0.5 s whoever pressed more leads (ties: the hook reels). */
function startTug(ctx: AbilityCtx, t: Actor): void {
  const { game, actor } = ctx;
  const d = actor.data<HookData>("bloodhook");
  d.tug = {
    targetId: t.id,
    endTick: game.now + ticks(ctx.n("tugSeconds")),
    nextCheck: game.now + ticks(ctx.n("tugWindowSeconds")),
    kStart: actor.input.jumpPresses,
    sStart: t.input.jumpPresses,
    kLast: actor.input.jumpPresses,
    sLast: t.input.jumpPresses,
    lead: true,
  };
  actor.flags.add("tugOfWar");
  t.flags.add("tugOfWar");
  game.fx.title([actor.id, t.id], "§4TUG OF WAR", "§7Spam JUMP!", 20, 0, 5);
  tugPull(ctx, t);
}

function endTug(game: Game, a: Actor, result: "reel" | "escape" | "stunned" | "gone"): void {
  const d = a.data<HookData>("bloodhook");
  const tug = d.tug;
  if (!tug) return;
  d.tug = null;
  const p = abilityParams(a, "bloodhook");
  a.flags.delete("tugOfWar");
  const t = game.get(tug.targetId);
  if (t) ungrab(game, t);
  if (result === "reel" && t && t.alive) {
    // Successful reel-in: the survivor is yanked in front of him for +25.
    teleportSafe(game, t, game.pointInFront(a, 1.2));
    game.clearNav(t);
    game.damage(t, p.reelDamage, a, { kind: "ability", abilityId: "bloodhook", tags: ["grab"] });
    game.fx.sound("chain", a.pos);
    landedPull(game, a, p);
    return;
  }
  a.removeMoveMod("bloodhook_hold");
  if (result === "escape") {
    // Survivor escapes in place; Nosferatu is Helpless for ~0.75 s.
    game.status(a, "helpless", 1, p.escapeHelplessSeconds, a);
    if (t) game.fx.flash([t.id], "§aYou broke free!");
  }
}

function tickTug(a: Actor, game: Game): void {
  const d = a.data<HookData>("bloodhook");
  const tug = d.tug;
  if (!tug) return;
  const p = abilityParams(a, "bloodhook");
  const t = game.get(tug.targetId);
  if (!t || !t.alive || !a.alive) {
    endTug(game, a, "gone");
    return;
  }
  if (a.isStunned(game.now)) {
    endTug(game, a, "stunned");
    return;
  }
  game.fx.line("blood", eye(a), add(t.pos, { x: 0, y: 1.2, z: 0 }), 0.8);
  if (dist2D(t.pos, a.pos) <= 1.6) {
    endTug(game, a, "reel");
    return;
  }
  if (game.now >= tug.nextCheck) {
    const kd = a.input.jumpPresses - tug.kLast;
    const sd = t.input.jumpPresses - tug.sLast;
    tug.kLast = a.input.jumpPresses;
    tug.sLast = t.input.jumpPresses;
    tug.lead = kd >= sd;
    tug.nextCheck = game.now + ticks(p.tugWindowSeconds);
    if (tug.lead) tugPull(makeCtx(game, a, a.ability("bloodhook")!), t);
    else if (t.forced?.id === "bloodhook_pull") game.endForced(t, "cancel");
  }
  if (game.now >= tug.endTick) {
    const k = a.input.jumpPresses - tug.kStart;
    const s = t.input.jumpPresses - tug.sStart;
    endTug(game, a, k >= s ? "reel" : "escape");
  }
}

export function tugState(a: Actor): TugState | null {
  return a.data<HookData>("bloodhook").tug ?? null;
}

// ============================================================================ Cataclysm

function spawnPuddle(ctx: AbilityCtx, pos: Vec3, touched: Map<string, number>): void {
  const { game, actor } = ctx;
  game.spawnObject({
    kind: "blood_puddle",
    owner: actor,
    pos: { x: pos.x, y: game.grid.originY, z: pos.z },
    radius: blocks(ctx.n("puddleRadiusStuds")),
    lifeSeconds: ctx.n("puddleSeconds"),
    update(o, g) {
      if (g.now % 10 === 0) g.fx.particle("blood", add(o.pos, { x: 0, y: 0.1, z: 0 }));
      for (const s of g.enemiesOf(actor, false)) {
        if (dist2D(s.pos, o.pos) > o.radius + ACTOR_RADIUS || Math.abs(s.pos.y - o.pos.y) > 1.5) continue;
        if (g.now - (touched.get(s.id) ?? -Infinity) < ticks(ctx.n("bleedSeconds"))) continue;
        touched.set(s.id, g.now);
        g.status(s, "bleeding", ctx.n("bleedLevel"), ctx.n("bleedSeconds"), actor, { mode: "max" });
        g.status(s, "slowness", ctx.n("slowLevel"), ctx.n("slowSeconds"), actor);
        g.reveal(s, [actor.id], ctx.n("highlightSeconds"), { color: "red", source: "cataclysm" });
        g.fx.particle("blood", add(s.pos, { x: 0, y: 0.5, z: 0 }));
      }
    },
  });
}

// ============================================================================ kit

function busy(ctx: AbilityCtx): true | string {
  const a = ctx.actor;
  if (a.channel) return "busy";
  const hook = a.data<HookData>("bloodhook");
  if (hook.pending || hook.tug) return "hooking";
  if (a.data<AscensionData>("ascension").diving) return "diving";
  return true;
}

function notInBat(ctx: AbilityCtx): true | string {
  if (inBatForm(ctx.actor)) return "bat form";
  return busy(ctx);
}

export const nosferatuKit: Kit = {
  id: "nosferatu",
  init(a) {
    // Levitation: no footstep sounds.
    a.flags.add("silent");
    a.addHooks("hunters_feast", {
      abilityUsed(self, _id, g) {
        breakFeast(g, self);
      },
    });
  },
  tick(a, game) {
    if (a.flags.has("feastInvis") && !a.statuses.has("undetectable") && !a.statuses.has("invisibility")) a.flags.delete("feastInvis");
    tickBatForm(a, game);
    tickTug(a, game);
  },
  abilities: {
    lacerate: {
      can: busy,
      hud(ctx) {
        return inBatForm(ctx.actor) ? "§cDIVE" : null;
      },
      use(ctx) {
        if (inBatForm(ctx.actor)) {
          dive(ctx);
          return;
        }
        basicAttack(ctx, ctx.n("damage"));
      },
    },
    bloodhook: {
      can: notInBat,
      hud(ctx) {
        const tug = (ctx.data as HookData).tug;
        if (!tug) return null;
        const t = ctx.game.get(tug.targetId);
        return `§4TUG ${ctx.actor.input.jumpPresses - tug.kStart}-${t ? t.input.jumpPresses - tug.sStart : 0}`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const d = ctx.data as HookData;
        d.pending = true;
        game.fx.sound("chain", actor.pos);
        game.windup(
          actor,
          ctx.n("windup"),
          () => {
            const f = flat(actor.facing);
            const speed = projSpeed(ctx.n("projectileStudsPerSecond"));
            const life = blocks(ctx.n("rangeStuds")) / (speed * 20);
            spawnProjectile(game, {
              owner: actor,
              kind: "bloodhook",
              pos: { x: actor.pos.x + f.x * 0.6, y: actor.pos.y + 1.2, z: actor.pos.z + f.z * 0.6 },
              vel: scale(f, speed),
              radius: 0.4,
              lifeSeconds: life,
              hit: "enemies",
              particle: "blood",
              onTick: (o, g) => g.fx.line("blood", eye(actor), o.pos, 0.8),
              onHitActor: (o, t) => {
                hookHit(ctx, o, t);
                return true;
              },
              onHitWall: () => hookMiss(ctx),
              onExpire: () => hookMiss(ctx),
            });
          },
          {
            abilityId: "bloodhook",
            label: "Bloodhook",
            onCancel: () => hookMiss(ctx),
          },
        );
        return { noCooldown: true };
      },
    },
    cataclysm: {
      can: notInBat,
      use(ctx) {
        const { game, actor } = ctx;
        // Invisibility from this ability must survive the abilityUsed hook that ends Hunter's Feast stealth.
        breakFeast(game, actor);
        const start = { ...actor.pos };
        const touched = new Map<string, number>();
        const spacing = blocks(ctx.n("puddleRadiusStuds"));
        let last = start;
        game.status(actor, "invisibility", ctx.n("invisLevel"), ctx.n("returnDelay"), actor);
        game.fx.sound("swing", actor.pos);
        spawnPuddle(ctx, start, touched);
        game.dash(actor, {
          id: "cataclysm",
          studsPerSecond: ctx.n("dashStudsPerSecond"),
          seconds: ctx.n("dashSeconds"),
          onTick: () => {
            if (dist2D(actor.pos, last) < spacing) return;
            last = { ...actor.pos };
            spawnPuddle(ctx, last, touched);
          },
        });
        // About two seconds later: teleported back to the start, stomp explosion.
        game.schedule(actor, ctx.n("returnDelay"), () => {
          if (actor.forced?.id === "cataclysm") game.endForced(actor, "cancel");
          const back = teleportSafe(game, actor, start);
          game.clearNav(actor);
          if (!actor.flags.has("feastInvis")) game.removeStatus(actor, "invisibility");
          const center = add(back, { x: 0, y: 1, z: 0 });
          game.fx.sound("explosion", back);
          game.fx.particle("explosion", center);
          game.fx.ring("blood", back, blocks(ctx.n("explosionRadiusStuds")), 24);
          for (const t of enemiesInRadius(game, actor, center, blocks(ctx.n("explosionRadiusStuds")))) {
            game.damage(t, ctx.n("damage"), actor, { kind: "ability", abilityId: "cataclysm", tags: ["aoe"] });
          }
          game.status(actor, "stun_immune", 1, ctx.n("lingerStunImmuneSeconds"), actor);
        });
      },
    },
    hunters_feast: {
      can(ctx) {
        if ((ctx.data as FeastData).pending) return "busy";
        return notInBat(ctx);
      },
      hud(ctx) {
        return (ctx.data as FeastData).active ? "§5REDIRECT" : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const d = ctx.data as FeastData;
        d.pending = true;
        d.redirected = false;
        d.cdStarted = false;
        game.fx.sound("bats", actor.pos);
        game.windup(actor, ctx.n("windup"), () => launchFeast(ctx), {
          abilityId: "hunters_feast",
          label: "Hunter's Feast",
          onCancel: () => {
            d.pending = false;
            feastCooldown(ctx);
          },
        });
        return { noCooldown: true };
      },
      release(ctx) {
        // Redirect once toward the current facing, three times faster; the cooldown starts now.
        const d = ctx.data as FeastData;
        const o = d.orb;
        d.active = false;
        if (!o || o.dead || d.redirected) return;
        d.redirected = true;
        const speed = projSpeed(ctx.n("projectileStudsPerSecond")) * ctx.n("redirectSpeedMul");
        o.data.vel = scale(flat(ctx.actor.facing), speed);
        ctx.game.fx.sound("bats", o.pos);
        feastCooldown(ctx);
      },
    },
    ascension: {
      can: busy,
      hud(ctx) {
        const d = ctx.data as AscensionData;
        if (!inBatForm(ctx.actor)) return null;
        return `§5${Math.max(0, ((d.endTick ?? 0) - ctx.game.now) / 20).toFixed(1)}s`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const d = ctx.data as AscensionData;
        const secs = ctx.n("maxSeconds");
        actor.flags.add("batForm");
        actor.flags.add("flying");
        actor.addMoveMod({ id: "ascension", endTick: Infinity, mul: ctx.n("speedMul") });
        // Complete invincibility and no stuns while a bat.
        game.status(actor, "invincible", 1, secs + 1, actor);
        game.status(actor, "stun_immune", 1, secs + 1, actor);
        actor.staminaFrozen = true;
        actor.res.terrorMul = ctx.n("terrorMul");
        d.active = true;
        d.diving = false;
        d.endTick = game.now + ticks(secs);
        // Leaps up (the adapter handles flight for the "flying" flag: flaps on jump, hover height).
        actor.body.impulse({ x: 0, y: ctx.n("flapStrength"), z: 0 });
        game.fx.sound("bats", actor.pos, { volume: 3 });
        game.fx.particle("bats", add(actor.pos, { x: 0, y: 1, z: 0 }));
        return { noCooldown: true };
      },
      release(ctx) {
        // Dismount: "extremely quiet"; exiting without a dive gives the penalty.
        const d = ctx.data as AscensionData;
        if (d.diving) return;
        endBatForm(ctx.game, ctx.actor, true);
      },
    },
  },
};

// ============================================================================ Hunter's Feast

type FeastData = { active?: boolean; pending?: boolean; orb?: WorldObject | null; redirected?: boolean; cdStarted?: boolean };

function feastCooldown(ctx: AbilityCtx): void {
  const d = ctx.actor.data<FeastData>("hunters_feast");
  if (d.cdStarted) return;
  d.cdStarted = true;
  ctx.game.startCooldown(ctx.actor, "hunters_feast", ctx.def.cooldown ?? 16);
}

function launchFeast(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const d = actor.data<FeastData>("hunters_feast");
  d.pending = false;
  const f = flat(actor.facing);
  const done = () => {
    d.active = false;
    d.orb = null;
    feastCooldown(ctx);
  };
  d.active = true;
  d.orb = spawnProjectile(game, {
    owner: actor,
    kind: "bat_orb",
    pos: { x: actor.pos.x + f.x * 0.8, y: actor.pos.y + 1.3, z: actor.pos.z + f.z * 0.8 },
    vel: scale(f, projSpeed(ctx.n("projectileStudsPerSecond"))),
    radius: 0.5,
    lifeSeconds: ctx.n("lifeSeconds"),
    hit: "enemies",
    prop: "bat_orb",
    particle: "bats",
    onHitActor: (_o, t) => {
      feastHit(ctx, t);
      done();
      return true;
    },
    onHitWall: () => done(),
    onExpire: () => done(),
  });
}

function feastHit(ctx: AbilityCtx, t: Actor): void {
  const { game, actor } = ctx;
  const ev = game.damage(t, ctx.n("damage"), actor, { kind: "ability", abilityId: "hunters_feast", tags: ["projectile"] });
  game.fx.sound("bats", t.pos);
  if (ev.cancelled) return;
  if (t.alive) {
    game.status(t, "oblivious", 1, ctx.n("debuffSeconds"), actor);
    game.status(t, "creatures", 1, ctx.n("debuffSeconds"), actor);
    game.reveal(t, [actor.id], ctx.n("revealSeconds"), { color: "red", source: "hunters_feast" });
  }
  // Nosferatu turns (almost) invisible and Undetectable until he uses an ability.
  game.status(actor, "invisibility", ctx.n("selfInvisLevel"), ctx.n("selfSeconds"), actor);
  game.status(actor, "undetectable", 1, ctx.n("selfSeconds"), actor);
  actor.flags.add("feastInvis");
}

// Guest 666 (wiki, 2026-10-01): Manic Fixation, Hellforged Will, Bloodhound (Blood, Hemorrhage, Blood Orbs),
// Sense of Fear, Carving Slash, Eviscerate, Demonic Pursuit, Infernal Cry, Blood Rush / Blood Hunt.
import { makeCtx, type AbilityCtx, type Kit } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import type { WorldObject } from "../objects";
import { statusDef } from "../../entities/statuses";
import { eye, inArc } from "../hit";
import { addRes, basicAttack, blocks, enemiesInRadius, swing } from "./common";
import { ticks } from "../../core/scale";
import { add, angleBetween2D, dist2D, flat, rotateY, sub, type Vec3 } from "../../util/vec";

type P = Record<string, number>;

function passiveParams(a: Actor, id: string): P {
  return a.character.passives.find((p) => p.id === id)!.params as P;
}

function abilityParams(a: Actor, id: string): P {
  return a.ability(id)!.params as P;
}

// ============================================================================ Blood

export function blood(a: Actor): number {
  return a.res.blood ?? 0;
}

export function maxBlood(a: Actor): number {
  return a.res.maxBlood ?? passiveParams(a, "bloodhound").maxBlood;
}

export function addBlood(a: Actor, amount: number): number {
  return addRes(a, "blood", amount, maxBlood(a));
}

export function inBloodHunt(a: Actor): boolean {
  return a.flags.has("bloodHunt");
}

// ============================================================================ Sense of Fear / Manic Fixation

type FixationData = { bonus?: number; highlights?: Record<string, number> };

/** Sense of Fear: Guest 666's reveals are Marked (red, bypass Undetectable) and apply the Marked status. */
function markSurvivor(game: Game, guest: Actor, t: Actor, seconds: number, source: string, fixation: boolean, color: "red" | "white" = "red"): void {
  if (!t.alive) return;
  game.reveal(t, [guest.id], seconds, { color, marked: true, source });
  game.status(t, "marked", 1, seconds, guest);
  if (fixation) {
    // Manic Fixation keeps tracking the highlight even if Undetectable cleanses Marked.
    const d = guest.data<FixationData>("manic_fixation");
    d.highlights ??= {};
    d.highlights[t.id] = Math.max(d.highlights[t.id] ?? 0, game.now + ticks(seconds));
  }
}

function tickFixation(a: Actor, game: Game): void {
  const mf = passiveParams(a, "manic_fixation");
  const chaseR = blocks(passiveParams(a, "bloodhound").chaseRangeStuds);
  const d = a.data<FixationData>("manic_fixation");
  const range = blocks(mf.rangeStuds);
  const moving = a.state.speed > 0.02 || (a.isBot && !!a.input.moveDir);
  const step = flat(sub(a.pos, a.lastPos));
  const moveDir = a.isBot && a.input.moveDir ? flat(a.input.moveDir) : step.x !== 0 || step.z !== 0 ? step : flat(a.facing);
  let cap = 0;
  for (const s of game.aliveSurvivors()) {
    if ((d.highlights?.[s.id] ?? 0) <= game.now) continue;
    const dd = dist2D(a.pos, s.pos);
    const toward = moving && Math.abs(angleBetween2D(moveDir, flat(sub(s.pos, a.pos)))) <= 45;
    if (dd > range && !toward) continue;
    // +15% when the highlighted survivor is not in chase, +10% otherwise.
    cap = Math.max(cap, dd > chaseR ? mf.outOfChaseBonus : mf.maxBonus);
  }
  if (cap <= 0) {
    d.bonus = 0;
    a.removeMoveMod("manic_fixation");
    return;
  }
  d.bonus = Math.min(cap, (d.bonus ?? 0) + (cap * game.dt) / mf.rampSeconds);
  a.addMoveMod({ id: "manic_fixation", endTick: game.now + 2, mul: 1 + d.bonus });
}

// ============================================================================ Bloodhound: Blood Orbs

/** Drops a Blood Orb near `at`: Guest 666 collects it by touch for +15 Blood and -3 s on all cooldowns. */
export function dropBloodOrb(game: Game, guest: Actor, at: Vec3): WorldObject {
  const bh = passiveParams(guest, "bloodhound");
  const want = add(at, rotateY({ x: 0.6, y: 0, z: 0 }, game.rng.range(0, 360)));
  const cell = game.grid.toGrid(want);
  const pos = game.grid.walkable(cell.x, cell.z) ? { x: want.x, y: game.grid.originY, z: want.z } : { x: at.x, y: game.grid.originY, z: at.z };
  return game.spawnObject({
    kind: "blood_orb",
    owner: guest,
    pos,
    radius: 0.9,
    lifeSeconds: bh.orbLifeSeconds,
    prop: "blood_orb",
    propName: "§4Blood Orb",
    update(o, g) {
      if (g.now % 10 === 0) g.fx.particle("blood", add(o.pos, { x: 0, y: 0.6, z: 0 }));
      if (!guest.alive || dist2D(guest.pos, o.pos) > o.radius + 0.5 || Math.abs(guest.pos.y - o.pos.y) > 2.5) return;
      addBlood(guest, bh.orbBlood);
      guest.cooldowns.reduceAll(ticks(bh.orbCooldownCut), g.now);
      g.fx.sound("pickup", guest.pos, { to: [guest.id] });
      g.fx.particle("blood", add(guest.pos, { x: 0, y: 1.5, z: 0 }), { to: [guest.id] });
      g.removeObject(o, "consumed");
    },
  });
}

/** Hemorrhaged survivors drop orbs: 1 per 10 s sprinting, 1 per 35 s in chase, 1 per 25 s sprinting in chase. */
function tickOrbDrops(a: Actor, game: Game): void {
  const bh = passiveParams(a, "bloodhound");
  const d = a.data<{ orbProgress?: Record<string, number> }>("bloodhound");
  d.orbProgress ??= {};
  const chaseR = blocks(bh.chaseRangeStuds);
  for (const s of game.aliveSurvivors()) {
    if (!s.statuses.has("hemorrhage")) {
      d.orbProgress[s.id] = 0;
      continue;
    }
    const chase = dist2D(s.pos, a.pos) <= chaseR;
    const interval = s.sprinting && chase ? bh.dropSprintChaseSeconds : s.sprinting ? bh.dropSprintSeconds : chase ? bh.dropChaseSeconds : 0;
    if (interval <= 0) continue;
    let prog = (d.orbProgress[s.id] ?? 0) + game.dt / interval;
    if (prog >= 1 - 1e-9) {
      prog -= 1;
      dropBloodOrb(game, a, s.pos);
    }
    d.orbProgress[s.id] = Math.max(0, prog);
  }
}

// ============================================================================ Blood Rush / Blood Hunt

type HuntData = { huntLeft?: number; huntKills?: number; nextFlash?: number; nextHemoFlash?: number; lmsCut?: boolean };

function humans(game: Game): string[] {
  return game.actors.filter((x) => !x.isMinion).map((x) => x.id);
}

function startBloodHunt(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const d = actor.data<HuntData>("blood_rush");
  actor.flags.add("bloodHunt");
  d.huntLeft = ctx.n("huntSeconds");
  d.huntKills = 0;
  d.nextFlash = game.now;
  d.nextHemoFlash = game.now;
  d.lmsCut = false;
  actor.res.terrorMul = ctx.n("huntTerrorMul");
  actor.addMoveMod({ id: "blood_hunt", endTick: Infinity, mul: 1 + ctx.n("huntSpeedBonus") });
  actor.cooldowns.resetAll();
  const ids = humans(game);
  for (const id of ids) game.fx.fog(id, "bloodHunt", true);
  game.fx.title(ids, "§4BLOOD HUNT", "§cRUN", 40);
  game.fx.sound("shriek", actor.pos, { volume: 4 });
  game.log(`${actor.displayName} started a Blood Hunt`);
}

export function endBloodHunt(game: Game, a: Actor): void {
  if (!inBloodHunt(a)) return;
  const bh = passiveParams(a, "bloodhound");
  a.flags.delete("bloodHunt");
  delete a.res.terrorMul;
  a.removeMoveMod("blood_hunt");
  // All Blood is removed and the maximum grows by 50.
  a.res.maxBlood = maxBlood(a) + bh.maxBloodGrowth;
  a.res.blood = 0;
  for (const id of humans(game)) game.fx.fog(id, "bloodHunt", false);
  game.startCooldown(a, "blood_rush", a.ability("blood_rush")!.cooldown ?? 30);
  game.fx.flash([a.id], "§7Blood Hunt ended");
  game.log(`${a.displayName}'s Blood Hunt ended`);
}

function tickBloodHunt(a: Actor, game: Game): void {
  if (!inBloodHunt(a)) {
    // Blood Hunt has no real cooldown: usable the moment Blood is full.
    if (blood(a) >= maxBlood(a) && !game.round.lms && a.cooldowns.remaining("blood_rush", game.now) > 0) a.cooldowns.reset("blood_rush");
    return;
  }
  const p = abilityParams(a, "blood_rush");
  const d = a.data<HuntData>("blood_rush");
  // Last Man Standing cuts an active Blood Hunt to 6 s.
  if (game.round.lms && !d.lmsCut) {
    d.lmsCut = true;
    d.huntLeft = Math.min(d.huntLeft ?? 0, p.lmsHuntSeconds);
  }
  // In chase the Blood Hunt timer drains at half speed.
  const chaseR = blocks(passiveParams(a, "bloodhound").chaseRangeStuds);
  const inChase = game.aliveSurvivors().some((s) => dist2D(s.pos, a.pos) <= chaseR);
  d.huntLeft = (d.huntLeft ?? 0) - game.dt * (inChase ? p.huntChaseDrainMul : 1);
  // Survivors flash red every 5 s; Hemorrhaged ones flash faster and in white.
  if (game.now >= (d.nextFlash ?? 0)) {
    d.nextFlash = game.now + ticks(p.huntFlashSeconds);
    for (const s of game.aliveSurvivors()) if (!s.statuses.has("hemorrhage")) markSurvivor(game, a, s, p.flashRevealSeconds, "blood_hunt", false, "red");
  }
  if (game.now >= (d.nextHemoFlash ?? 0)) {
    d.nextHemoFlash = game.now + ticks(p.hemoFlashSeconds);
    for (const s of game.aliveSurvivors()) if (s.statuses.has("hemorrhage")) markSurvivor(game, a, s, p.flashRevealSeconds, "blood_hunt_hemo", false, "white");
  }
  if ((d.huntLeft ?? 0) <= 0) endBloodHunt(game, a);
}

// ============================================================================ Demonic Pursuit

type PursuitData = { active?: boolean; phase?: "charge" | "leap" | "pin"; chargeStart?: number; level?: number; targetId?: string | null };

/** Charge level 0..2 (26/33/40 damage) from the time spent charging. */
export function pursuitLevel(a: Actor, game: Game): number {
  const p = abilityParams(a, "demonic_pursuit");
  const d = a.data<PursuitData>("demonic_pursuit");
  const t = (game.now - (d.chargeStart ?? game.now)) / 20;
  return Math.max(0, Math.min(2, Math.floor((t / p.maxChargeSeconds) * 3)));
}

function pursuitEndCharge(game: Game, a: Actor): void {
  a.removeMoveMod("dp_charge");
  a.flags.delete("crouching");
  game.removeStatus(a, "invisibility");
}

function pursuitFinish(game: Game, a: Actor, cooldown: number): void {
  const d = a.data<PursuitData>("demonic_pursuit");
  d.active = false;
  d.phase = undefined;
  d.targetId = null;
  a.staminaFrozen = false;
  game.startCooldown(a, "demonic_pursuit", cooldown);
}

function pursuitLeap(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const d = actor.data<PursuitData>("demonic_pursuit");
  const lvl = pursuitLevel(actor, game);
  d.level = lvl;
  d.phase = "leap";
  d.targetId = null;
  pursuitEndCharge(game, actor);
  // Aimable leap (can be angled upward).
  actor.body.impulse({ x: 0, y: 0.35 + Math.max(0, actor.facing.y) * 0.6, z: 0 });
  game.fx.sound("roar", actor.pos);
  game.dash(actor, {
    id: "demonic_pursuit",
    studsPerSecond: ctx.param<number[]>("leapStudsPerSecond")[lvl],
    seconds: ctx.n("leapSeconds"),
    noStaminaRegen: true,
    onTick: () => {
      const dir = actor.forced ? actor.forced.dir : flat(actor.facing);
      const center = add(actor.pos, { x: dir.x * 0.6, y: 1, z: dir.z * 0.6 });
      const hit = enemiesInRadius(game, actor, center, blocks(ctx.n("hitRadiusStuds"))).sort((x, y) => dist2D(actor.pos, x.pos) - dist2D(actor.pos, y.pos))[0];
      if (!hit) return;
      d.targetId = hit.id;
      return false;
    },
    onEnd: (reason) => {
      if (d.phase !== "leap") return;
      const t = d.targetId ? game.get(d.targetId) : undefined;
      // Hitting an object or running out of leap time is a miss (15 s cooldown).
      if (reason === "cancel" && t && t.alive) pursuitPin(ctx, t, lvl);
      else pursuitFinish(game, actor, ctx.n("missCooldown"));
    },
  });
}

function pursuitPin(ctx: AbilityCtx, t: Actor, lvl: number): void {
  const { game, actor } = ctx;
  const d = actor.data<PursuitData>("demonic_pursuit");
  const bh = passiveParams(actor, "bloodhound");
  d.phase = "pin";
  const slashes = ctx.n("slashes");
  const interval = ctx.n("slashInterval");
  const pinSeconds = slashes * interval;
  let total = ctx.param<number[]>("pinDamage")[lvl];
  // Blood Hunt: +0.4 for every unhealable (Hemorrhage) HP.
  if (inBloodHunt(actor)) total += ctx.n("bloodHuntBonusPerHp") * t.maxHpPenalty;
  const per = total / slashes;
  t.addMoveMod({ id: "dp_pinned", endTick: game.now + ticks(pinSeconds), frozen: true });
  t.flags.add("grabbed");
  actor.addMoveMod({ id: "dp_pin", endTick: game.now + ticks(pinSeconds + ctx.n("endlagSeconds")), frozen: true });
  // Grapples grant hidden invincibility (wiki Status Effects).
  game.status(actor, "stun_immune", 1, pinSeconds, actor);
  game.status(actor, "invincible", 1, pinSeconds, actor);
  if (t.isSurvivor) {
    addBlood(actor, ctx.n("blood"));
    game.status(t, "hemorrhage", 1, bh.hemorrhageSeconds, actor, { mode: "add" });
  }
  game.startCooldown(actor, "demonic_pursuit", ctx.def.cooldown ?? 30);
  game.fx.sound("roar", actor.pos);
  for (let i = 1; i <= slashes; i++) {
    game.schedule(actor, interval * i, () => {
      if (!t.alive) return;
      game.damage(t, per, actor, { kind: "ability", abilityId: "demonic_pursuit", tags: ["melee", "grab"] });
      game.fx.sound("swing", actor.pos);
      game.fx.particle("blood", add(t.pos, { x: 0, y: 1.2, z: 0 }));
    });
  }
  game.schedule(actor, pinSeconds, () => {
    t.removeMoveMod("dp_pinned");
    t.flags.delete("grabbed");
    if (t.alive) {
      // Thrown to the left with a roar (about 20 studs).
      const left = rotateY(flat(actor.facing), -90);
      const b = blocks(ctx.n("throwStuds"));
      t.body.impulse({ x: left.x * b * 0.45, y: 0.4, z: left.z * b * 0.45 });
    }
    game.fx.sound("roar", actor.pos);
    d.active = false;
    d.phase = undefined;
    d.targetId = null;
    actor.staminaFrozen = false;
  });
}

function tickPursuit(a: Actor, game: Game): void {
  const d = a.data<PursuitData>("demonic_pursuit");
  if (d.phase !== "charge") return;
  const def = a.ability("demonic_pursuit")!;
  const p = def.params as P;
  if (a.isStunned(game.now)) {
    pursuitEndCharge(game, a);
    pursuitFinish(game, a, p.missCooldown);
    return;
  }
  // Auto-release at full charge.
  if (game.now - (d.chargeStart ?? game.now) >= ticks(p.maxChargeSeconds)) pursuitLeap(makeCtx(game, a, def));
}

// ============================================================================ Infernal Cry

function infernalCry(ctx: AbilityCtx): void {
  const { game, actor } = ctx;
  const hunt = inBloodHunt(actor);
  const mul = hunt ? ctx.n("bhHitboxMul") : 1;
  const range = blocks(ctx.n("rangeStuds")) * mul;
  const half = ctx.n("halfAngle") * mul;
  game.fx.sound("roar", actor.pos, { volume: 3 });
  game.fx.particle("roar", add(actor.pos, { x: 0, y: 1.6, z: 0 }));
  const f = flat(actor.facing);
  for (let k = 1; k <= 4; k++) game.fx.particle("sonic", add(actor.pos, { x: f.x * range * (k / 4), y: 1.4, z: f.z * range * (k / 4) }));
  const targets = game.enemiesOf(actor, false).filter((t) => t.isSurvivor && inArc(actor, t, range, half, 4) && game.lineOfSight(eye(actor), eye(t)));
  let landed = 0;
  for (const t of targets) {
    const hemorrhaged = t.statuses.has("hemorrhage");
    t.body.setFacing(flat(sub(actor.pos, t.pos)));
    if (hunt) game.damage(t, ctx.n("bhDamage"), actor, { kind: "ability", abilityId: "infernal_cry", tags: ["aoe"] });
    if (!t.alive) continue;
    landed++;
    game.status(t, "blindness", ctx.n("blindLevel"), hunt ? ctx.n("bhBlindSeconds") : ctx.n("blindSeconds"), actor);
    markSurvivor(game, actor, t, ctx.n("markSeconds"), "infernal_cry", true);
    if (hemorrhaged) for (let i = 0; i < ctx.n("orbs"); i++) dropBloodOrb(game, actor, t.pos);
  }
  if (hunt && landed > 0) {
    game.status(actor, "speed", ctx.n("bhSpeedLevel"), ctx.n("bhSpeedSeconds"), actor);
    game.status(actor, "strength", ctx.n("bhStrengthLevel"), ctx.n("bhStrengthSeconds"), actor);
  }
}

// ============================================================================ kit

function busy(ctx: AbilityCtx): true | string {
  if (ctx.actor.channel) return "busy";
  if (ctx.actor.data<PursuitData>("demonic_pursuit").phase) return "pursuing";
  return true;
}

export const guest666Kit: Kit = {
  id: "guest_666",
  init(a) {
    const bh = passiveParams(a, "bloodhound");
    const hw = passiveParams(a, "hellforged_will");
    a.res.blood = bh.startBlood;
    a.res.maxBlood = bh.maxBlood;
    a.addHooks("bloodhound", {
      // His damage applies Hemorrhage (Eviscerate and Demonic Pursuit add their own stack).
      afterDealDamage(self, ev, g) {
        if (ev.kind === "dot" || ev.kind === "self" || !ev.target.isSurvivor || ev.dealt + ev.absorbed <= 0) return;
        if (ev.abilityId === "eviscerate" || ev.abilityId === "demonic_pursuit") return;
        g.status(ev.target, "hemorrhage", 1, bh.hemorrhageSeconds, self, { mode: "max" });
      },
      kill(self, _victim, ev, g) {
        addBlood(self, ev?.abilityId === "demonic_pursuit" ? bh.demonicKillBlood : bh.killBlood);
        if (!inBloodHunt(self)) return;
        // A kill during Blood Hunt resets every cooldown and extends it (15 s, decreasing per kill).
        const p = abilityParams(self, "blood_rush");
        const d = self.data<HuntData>("blood_rush");
        d.huntLeft = (d.huntLeft ?? 0) + Math.max(0, p.killExtendSeconds - p.killExtendDecay * (d.huntKills ?? 0));
        d.huntKills = (d.huntKills ?? 0) + 1;
        self.cooldowns.resetAll();
        g.fx.flash([self.id], "§4Blood Hunt extended");
      },
    });
    a.addHooks("hellforged_will", {
      // Non-self-inflicted negative statuses and stuns last 25% less (50% during Blood Hunt).
      modifyStatus(self, id, change, source) {
        if (source === self || statusDef(id).kind !== "debuff") return change;
        const r = inBloodHunt(self) ? hw.bloodHuntReduction : hw.reduction;
        return { level: change.level, seconds: change.seconds * (1 - r) };
      },
      modifyStun(self, seconds, source) {
        if (source === self) return seconds;
        return seconds * (1 - (inBloodHunt(self) ? hw.bloodHuntReduction : hw.reduction));
      },
    });
  },
  tick(a, game) {
    tickPursuit(a, game);
    tickOrbDrops(a, game);
    tickFixation(a, game);
    tickBloodHunt(a, game);
  },
  abilities: {
    carving_slash: {
      can: busy,
      use(ctx) {
        // Hits every survivor in reach; +10 Blood per survivor hit (Hemorrhage comes from Bloodhound).
        basicAttack(ctx, ctx.n("damage"), (t) => {
          if (t.isSurvivor) addBlood(ctx.actor, ctx.n("blood"));
        });
      },
    },
    eviscerate: {
      can(ctx) {
        if (blood(ctx.actor) < ctx.n("bloodCost")) return `needs ${ctx.n("bloodCost")} Blood`;
        return busy(ctx);
      },
      hud(ctx) {
        return `-${ctx.n("bloodCost")} Blood`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const bh = passiveParams(actor, "bloodhound");
        actor.res.blood = blood(actor) - ctx.n("bloodCost");
        let landed = false;
        swing(ctx, {
          windup: ctx.n("windup"),
          rangeStuds: ctx.n("rangeStuds"),
          halfAngle: ctx.n("halfAngle"),
          abilityId: "eviscerate",
          objectDamage: ctx.n("damage"),
          lunge: { studs: ctx.n("lungeStuds"), seconds: 0.25 },
          onHit(t) {
            const ev = game.damage(t, ctx.n("damage"), actor, { kind: "basic", abilityId: "eviscerate", tags: ["melee"] });
            if (ev.cancelled) return;
            landed = true;
            if (t.isSurvivor && t.alive) game.status(t, "hemorrhage", ctx.n("hemorrhageLevel"), bh.hemorrhageSeconds, actor, { mode: "add" });
            game.fx.particle("blood", add(t.pos, { x: 0, y: 1.2, z: 0 }));
          },
          after() {
            if (landed) {
              addBlood(actor, ctx.n("bloodGain"));
              actor.cooldowns.scaleRemaining("eviscerate", ctx.n("hitCooldownFactor"), game.now);
              game.status(actor, "slowness", ctx.n("missSlowLevel"), ctx.n("hitSlowSeconds"), actor);
            } else {
              game.status(actor, "slowness", ctx.n("missSlowLevel"), ctx.n("missSlowSeconds"), actor);
            }
          },
        });
      },
    },
    demonic_pursuit: {
      can: busy,
      hud(ctx) {
        const d = ctx.data as PursuitData;
        return d.phase === "charge" ? `§cCHARGE ${pursuitLevel(ctx.actor, ctx.game) + 1}/3` : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const d = ctx.data as PursuitData;
        d.active = true;
        d.phase = "charge";
        d.chargeStart = game.now;
        d.targetId = null;
        // Crouches and turns transparent while charging; stamina freezes for the whole move.
        actor.addMoveMod({ id: "dp_charge", endTick: Infinity, mul: ctx.n("chargeMoveMul") });
        actor.flags.add("crouching");
        game.status(actor, "invisibility", ctx.n("chargeInvisLevel"), ctx.n("maxChargeSeconds") + 0.5, actor);
        actor.staminaFrozen = true;
        game.fx.sound("windup", actor.pos);
        return { noCooldown: true };
      },
      release(ctx) {
        if ((ctx.data as PursuitData).phase === "charge") pursuitLeap(ctx);
      },
    },
    infernal_cry: {
      can: busy,
      use(ctx) {
        const { game, actor } = ctx;
        // Transparent during the windup.
        game.status(actor, "invisibility", 2, ctx.n("windup"), actor);
        game.fx.sound("windup", actor.pos);
        game.windup(actor, ctx.n("windup"), () => infernalCry(ctx), { abilityId: "infernal_cry", label: "Infernal Cry" });
      },
    },
    blood_rush: {
      can(ctx) {
        if (inBloodHunt(ctx.actor)) return "Blood Hunt active";
        return busy(ctx);
      },
      hud(ctx) {
        const a = ctx.actor;
        if (inBloodHunt(a)) return `§4HUNT ${Math.max(0, Math.ceil(a.data<HuntData>("blood_rush").huntLeft ?? 0))}s`;
        if (blood(a) >= maxBlood(a) && !ctx.game.round.lms) return "§4HUNT READY";
        return `§c${Math.floor(blood(a))}/${maxBlood(a)} Blood`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        if (blood(actor) >= maxBlood(actor) && !game.round.lms) {
          // Blood Hunt (replaces Blood Rush at full Blood; disabled during Last Man Standing).
          game.fx.sound("shriek", actor.pos, { volume: 4 });
          game.windup(actor, ctx.n("huntWindup"), () => startBloodHunt(ctx), { abilityId: "blood_rush", label: "Blood Hunt" });
          return { noCooldown: true };
        }
        game.fx.sound("roar", actor.pos, { volume: 2 });
        game.windup(
          actor,
          ctx.n("windup"),
          () => {
            // Marks every survivor: 5 s nearby up to 20 s at 200 studs.
            const maxD = blocks(ctx.n("maxDistanceStuds"));
            for (const s of game.aliveSurvivors()) {
              const f = Math.min(1, dist2D(actor.pos, s.pos) / maxD);
              markSurvivor(game, actor, s, ctx.n("minSeconds") + (ctx.n("maxSeconds") - ctx.n("minSeconds")) * f, "blood_rush", true);
            }
            game.fx.sound("roar", actor.pos, { volume: 3 });
          },
          { abilityId: "blood_rush", label: "Blood Rush" },
        );
      },
    },
  },
};


// 007n7 (wiki, 2026-10-01): DEX (furthest spawn), Clone, c00lgui, Inject.
import type { AbilityCtx, Kit } from "../engine";
import type { Actor } from "../../entities/actor";
import type { Game } from "../../core/game";
import { character } from "../../characters/roster";
import { config } from "../../core/config";
import { studs, ticks } from "../../core/scale";
import { add, dist2D, flat, rotateY, scale, type Vec3 } from "../../util/vec";
import { teleportSafe } from "./common";

export const INJECT_MODES = ["aimless", "pathfind", "cursor"] as const;
export type InjectMode = (typeof INJECT_MODES)[number];
const MODE_NAMES: Record<InjectMode, string> = { aimless: "Aimless", pathfind: "Pathfind", cursor: "Cursor" };

interface DexData extends Record<string, unknown> {
  index?: number;
  spawn?: Vec3;
}

interface CloneState {
  mode: InjectMode;
  dir: Vec3;
  runUntil: number;
  nextTurn: number;
  goal: Vec3 | null;
  stopped: boolean;
  wanderMin: number;
  wanderMax: number;
  stackRadius: number;
}

function params(a: Actor, id: string): Record<string, number> {
  return a.ability(id)!.params as Record<string, number>;
}

/**
 * DEX: the survivor spawn furthest from 007n7 right now (with a little hysteresis so the marker does not
 * flicker between two spawns at almost the same distance). Exposed on the actor for the HUD:
 * res.dexX / res.dexZ / res.dexIndex and data("dex").spawn.
 */
export function updateDex(game: Game, a: Actor): Vec3 {
  const d = a.data<DexData>("dex");
  const spawns = game.layout.survivorSpawns;
  let best = 0;
  let bestDist = -1;
  spawns.forEach((g, i) => {
    const dd = dist2D(a.pos, game.grid.toWorld(g));
    if (dd > bestDist) {
      bestDist = dd;
      best = i;
    }
  });
  if (d.index !== undefined && d.index !== best && d.index < spawns.length) {
    const cur = dist2D(a.pos, game.grid.toWorld(spawns[d.index]));
    if (bestDist - cur < 1) best = d.index;
  }
  const spawn = game.grid.toWorld(spawns[best]);
  d.index = best;
  d.spawn = spawn;
  a.res.dexIndex = best;
  a.res.dexX = spawn.x;
  a.res.dexZ = spawn.z;
  return spawn;
}

export function dexSpawn(game: Game, a: Actor): Vec3 {
  return a.data<DexData>("dex").spawn ?? updateDex(game, a);
}

export function injectMode(a: Actor): InjectMode {
  const m = a.data("inject").mode as InjectMode | undefined;
  return m && INJECT_MODES.includes(m) ? m : "aimless";
}

function blockedAhead(game: Game, pos: Vec3, dir: Vec3, distance: number): boolean {
  const q = add(pos, scale(dir, distance));
  return game.grid.blocksBody(Math.floor(q.x - game.grid.originX), Math.floor(q.z - game.grid.originZ));
}

/** Aimless: a new random direction with a few blocks of free walking ahead (falls back to turning around). */
function wanderDir(game: Game, clone: Actor, current: Vec3): Vec3 {
  for (let i = 0; i < 10; i++) {
    const d = flat(rotateY({ x: 0, y: 0, z: 1 }, game.rng.range(0, 360)));
    if (game.grid.walkLine(clone.pos, add(clone.pos, scale(d, 3)))) return d;
  }
  return { x: -current.x, y: 0, z: -current.z };
}

/** Steers a clone (runs from its own tick hook, so it keeps going even if 007n7 dies). */
function driveClone(game: Game, clone: Actor, st: CloneState): void {
  if (!clone.alive) return;
  const now = game.now;
  let dir: Vec3 | null = null;
  if (now < st.runUntil) {
    dir = st.dir;
  } else if (st.mode === "aimless") {
    if (now >= st.nextTurn || blockedAhead(game, clone.pos, st.dir, 0.8)) {
      st.dir = wanderDir(game, clone, st.dir);
      st.nextTurn = now + ticks(game.rng.range(st.wanderMin, st.wanderMax));
    }
    dir = st.dir;
  } else if (st.mode === "pathfind") {
    dir = st.goal ? game.navDirection(clone, st.goal) : null; // stops at the spawn
  } else {
    // Cursor: straight on until the surface in front.
    if (!st.stopped && blockedAhead(game, clone.pos, st.dir, 0.6)) st.stopped = true;
    dir = st.stopped ? null : st.dir;
  }
  clone.input.moveDir = dir;
  clone.input.wantSprint = dir !== null;
  clone.input.lookAt = dir ? add(clone.pos, scale(dir, 4)) : null;
  // Hit priority [undocumented]: the clone takes the hit before a stacked survivor whose HP is not higher
  // than its own, after one with more HP (Guest 1337 / Slateskin priorities stay above it).
  let nearest: Actor | null = null;
  let nd = st.stackRadius;
  for (const s of game.aliveSurvivors()) {
    const dd = dist2D(s.pos, clone.pos);
    if (dd <= nd) {
      nd = dd;
      nearest = s;
    }
  }
  clone.hitPriority = !nearest ? 1 : clone.hp >= nearest.hp ? 1.5 : 0.5;
}

function notBusy(ctx: AbilityCtx): true | string {
  return ctx.actor.channel ? "busy" : true;
}

export const n007n7Kit: Kit = {
  id: "007n7",
  init(a, game) {
    a.data("inject").mode = "aimless";
    a.res.injectMode = 0;
    updateDex(game, a);
  },
  tick(a, game) {
    const spawn = updateDex(game, a);
    // DEX marker, visible only to 007n7.
    if (game.now % 10 === 0) {
      const base = { x: spawn.x, y: spawn.y + 0.1, z: spawn.z };
      game.fx.line("trail", base, { x: base.x, y: base.y + 4, z: base.z }, 0.5, { viewers: [a.id] });
      game.fx.ring("auraSurvivor", base, 0.9, 12, { viewers: [a.id] });
    }
    // c00lgui: starting a generator cancels the channel.
    if (a.channel?.abilityId === "c00lgui" && a.input.repairTarget) {
      const g = game.generators.find((x) => x.id === a.input.repairTarget);
      if (g && !g.completed && dist2D(a.pos, { x: g.block.x + 0.5, y: g.block.y, z: g.block.z + 0.5 }) <= config().match.repairRangeBlocks) {
        game.interrupt(a, "manual");
      }
    }
  },
  abilities: {
    clone: {
      hud(ctx) {
        const clones = ((ctx.data.clones as Actor[] | undefined) ?? []).filter((c) => c.alive);
        return clones.length ? `x${clones.length}` : null;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const ip = params(actor, "inject");
        const mode = injectMode(actor);
        const dir = flat(actor.facing);
        const secs = ctx.n("cloneSeconds");
        const clone = game.spawnMinion({
          owner: actor,
          character: character("minion_clone"),
          pos: { ...actor.pos },
          name: actor.displayName,
          hp: Math.max(1, actor.hp),
          team: "survivor",
          skinIndex: actor.character.skinIndex,
          flags: ["hittableMinion", "clone"],
        });
        clone.body.setFacing(dir);
        clone.state = { ...clone.body.read(), pos: { ...actor.pos }, facing: dir };
        const speed = ctx.n("cloneSpeedStuds");
        clone.addMoveMod({ id: "clone_speed", endTick: Infinity, walkStuds: speed, sprintStuds: speed });
        const st: CloneState = {
          mode,
          dir,
          runUntil: game.now + ticks(ctx.n("initialRunSeconds")),
          nextTurn: 0,
          goal: mode === "pathfind" ? { ...updateDex(game, actor) } : null,
          stopped: false,
          wanderMin: ip.wanderMin,
          wanderMax: ip.wanderMax,
          stackRadius: studs(ctx.n("stackRadiusStuds")),
        };
        clone.data("clone").state = st;
        clone.addHooks("clone", { tick: (self, g) => driveClone(g, self, st) });
        driveClone(game, clone, st);
        // Lasts 10 s; owned by the clone so it still expires if 007n7 is eliminated.
        game.schedule(clone, secs, () => {
          if (clone.alive) {
            game.fx.particle("whiteSmoke", { x: clone.pos.x, y: clone.pos.y + 1, z: clone.pos.z });
            game.despawnMinion(clone);
          }
        });
        // Outlined in white for 007n7.
        game.reveal(clone, [actor.id], secs, { color: "white", source: "clone" });
        const list = ((ctx.data.clones as Actor[] | undefined) ?? []).filter((c) => c.alive);
        list.push(clone);
        ctx.data.clones = list;
        // 007n7 vanishes; hidden Helpless (no HUD entry) locks his abilities for 3 s.
        game.status(actor, "invisibility", ctx.n("invisLevel"), ctx.n("selfSeconds"), actor);
        game.status(actor, "undetectable", 1, ctx.n("selfSeconds"), actor);
        game.status(actor, "helpless", 1, ctx.n("helplessSeconds"), actor, { data: { hidden: 1 } });
        game.fx.sound("glitch", actor.pos);
        game.fx.particle("glitch", { x: actor.pos.x, y: actor.pos.y + 1, z: actor.pos.z });
      },
    },
    c00lgui: {
      can: notBusy,
      hud(ctx) {
        const s = dexSpawn(ctx.game, ctx.actor);
        return `→${Math.round(dist2D(ctx.actor.pos, s))}m`;
      },
      use(ctx) {
        const { game, actor } = ctx;
        const total = ctx.n("channelSeconds");
        game.fx.sound("glitch", actor.pos, { pitch: 1.2 });
        game.windup(
          actor,
          total,
          () => {
            const from = { ...actor.pos };
            const dest = updateDex(game, actor);
            teleportSafe(game, actor, dest, actor.facing);
            game.clearNav(actor);
            game.fx.sound("teleport", from);
            game.fx.sound("teleport", actor.pos);
            game.fx.particle("glitch", { x: from.x, y: from.y + 1, z: from.z });
            game.fx.particle("glitch", { x: actor.pos.x, y: actor.pos.y + 1, z: actor.pos.z });
            game.log(`${actor.displayName} used c00lgui`);
          },
          {
            abilityId: "c00lgui",
            label: "c00lgui",
            moveMul: ctx.n("moveMul"),
            noSprint: true,
            damageCancels: true,
            onCancel: () => game.fx.flash([actor.id], "§cc00lgui cancelled"),
          },
        );
        // Late window [undocumented]: in the last moments a hit no longer cancels the teleport.
        const ch = actor.channel;
        game.schedule(actor, Math.max(0, total - ctx.n("lateWindowSeconds")), () => {
          if (ch && actor.channel === ch) ch.damageCancels = false;
        });
      },
    },
    inject: {
      hud(ctx) {
        return MODE_NAMES[injectMode(ctx.actor)];
      },
      use(ctx) {
        const { game, actor } = ctx;
        const i = (INJECT_MODES.indexOf(injectMode(actor)) + 1) % INJECT_MODES.length;
        ctx.data.mode = INJECT_MODES[i];
        actor.res.injectMode = i;
        game.fx.sound("countdown", actor.pos, { to: [actor.id] });
        game.fx.flash([actor.id], `§aInject: §f${MODE_NAMES[INJECT_MODES[i]]}`);
      },
    },
  },
};

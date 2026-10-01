import { afterEach, describe, expect, it } from "vitest";
import { cellPos, place, realMatch, run, type FakeBody } from "../helpers";
import { useAbility, abilityHudText } from "../../src/abilities/engine";
import { broadcastMode, graffitiOf, skateSpeed, zoneAt } from "../../src/abilities/kits/veeronica";
import { resetConfig } from "../../src/core/config";
import { blocksPerSecond, ticks } from "../../src/core/scale";
import { flat, type Vec3 } from "../../src/util/vec";
import type { Actor } from "../../src/entities/actor";
import type { Game } from "../../src/core/game";
import type { WorldObject } from "../../src/abilities/objects";

afterEach(() => resetConfig());

const PX: Vec3 = { x: 1, y: 0, z: 0 };
const NZ: Vec3 = { x: 0, y: 0, z: -1 };
const PZ: Vec3 = { x: 0, y: 0, z: 1 };
/** South face of the ruin wall (cells z = 48, x 36..44, window at x 40). */
const RUIN_SOUTH = { x: 38.5, y: 100, z: 50.5 };
/** Next to the outer wall (cells z = 80), open floor along z = 79 from x 1 to 40. */
const OUTER = { x: 6.5, y: 100, z: 78.5 };
const SKATE_ROW = { x: 6.5, y: 100, z: 79.3 };

function vmatch(others = ["elliot"]) {
  const m = realMatch("slasher", ["veeronica", ...others]);
  for (const s of m.survivors.slice(1)) place(s, cellPos(14, 72));
  place(m.killer, cellPos(70, 10));
  return { ...m, vee: m.survivors[0] };
}

function face(a: Actor, dir: Vec3): void {
  (a.body as FakeBody).face(dir);
  a.state = a.body.read();
}

/** Sprays a graffiti from `pos` facing `dir` and returns it. */
function spray(game: Game, vee: Actor, pos: Vec3, dir: Vec3): WorldObject {
  place(vee, pos);
  face(vee, dir);
  const r = useAbility(game, vee, "vandalism");
  expect(r).toEqual({ ok: true });
  run(game, ticks(5) + 1);
  const list = graffitiOf(game, vee);
  return list[list.length - 1];
}

/** Graffiti on the outer wall, then Veeronica on the skate row facing +x and skating. */
function startSkating(game: Game, vee: Actor): void {
  spray(game, vee, OUTER, PZ);
  place(vee, SKATE_ROW);
  face(vee, PX);
  expect(useAbility(game, vee, "sk8")).toEqual({ ok: true });
}

function sk8Data(vee: Actor) {
  return vee.data("sk8") as Record<string, unknown>;
}

function jump(vee: Actor): void {
  vee.input.jumpPresses++;
}

describe("Veeronica — Metal Frame", () => {
  it("starts with 30% battery and cannot be healed by anything but her battery", () => {
    const { game, vee, survivors } = vmatch();
    const elliot = survivors[1];
    expect(vee.res.battery).toBe(30);
    vee.hp = 50;
    expect(game.heal(vee, 20, elliot)).toBe(0);
    expect(game.heal(vee, 20, vee)).toBe(0); // e.g. a Medkit she uses herself
    game.status(vee, "regeneration", 1, 5, elliot, { mode: "replace", data: { perSecond: 4, remaining: 20, cancelAt: 5 } });
    run(game, ticks(5));
    expect(vee.hp).toBe(50);
  });

  it("+8% per generator puzzle she completes (not others' puzzles, not fake generators)", () => {
    const { game, vee, survivors } = vmatch(["noob"]);
    const noob = survivors[1];
    game.setupGenerators([0, 1], [2]);
    const [real, other, fake] = game.generators;
    place(vee, { x: real.block.x + 0.5, y: 100, z: real.block.z + 1.5 });
    vee.input.repairTarget = real.id;
    place(noob, { x: other.block.x + 1.5, y: 100, z: other.block.z + 0.5 });
    noob.input.repairTarget = other.id;
    let guard = 0;
    while (vee.stats.layersRepaired < 1 && guard++ < 400) run(game, 1);
    expect(vee.stats.layersRepaired).toBe(1);
    expect(noob.stats.layersRepaired).toBeGreaterThanOrEqual(1);
    expect(vee.res.battery).toBe(38);
    vee.input.repairTarget = null;
    place(vee, { x: fake.block.x + 0.5, y: 100, z: fake.block.z + 1.5 });
    vee.input.repairTarget = fake.id;
    run(game, ticks(12));
    expect(fake.layerCredit.get(vee.id) ?? 0).toBeGreaterThanOrEqual(1);
    expect(vee.res.battery).toBe(38);
  });

  it("the battery is capped at 100% and cannot charge while Activate Battery runs", () => {
    const { game, vee } = vmatch();
    const hook = vee.hooks.find((h) => h.owner === "metal_frame")!.hooks.layerRepaired!;
    vee.res.battery = 97;
    hook(vee, game.generators[0], vee, game);
    expect(vee.res.battery).toBe(100);
    vee.res.battery = 40;
    vee.hp = 60;
    useAbility(game, vee, "activate_battery");
    hook(vee, game.generators[0], vee, game);
    expect(vee.res.battery).toBe(40);
  });
});

describe("Veeronica — Activate Battery", () => {
  it("at full HP or 0% it does nothing and only takes a 1 s cooldown", () => {
    const { game, vee } = vmatch();
    expect(useAbility(game, vee, "activate_battery").ok).toBe(true);
    expect(vee.cooldowns.remaining("activate_battery", game.now)).toBe(ticks(1));
    run(game, ticks(1));
    vee.hp = 50;
    vee.res.battery = 0;
    useAbility(game, vee, "activate_battery");
    expect(vee.cooldowns.remaining("activate_battery", game.now)).toBe(ticks(1));
    run(game, ticks(3));
    expect(vee.hp).toBe(50);
  });

  it("heals 1 HP/s for 2% each; HUD shows it active and the charge", () => {
    const { game, vee } = vmatch();
    vee.hp = 80;
    expect(useAbility(game, vee, "activate_battery").ok).toBe(true);
    const def = vee.ability("activate_battery")!;
    expect(abilityHudText(game, vee, def).label).toContain("ACTIVE");
    expect(abilityHudText(game, vee, def).label).toContain("30%");
    run(game, ticks(3));
    expect(vee.hp).toBe(83);
    expect(vee.res.battery).toBe(24);
    expect(vee.cooldowns.remaining("activate_battery", game.now)).toBe(0);
  });

  it("stops at full HP and starts the 75 s cooldown", () => {
    const { game, vee } = vmatch();
    vee.hp = 98;
    useAbility(game, vee, "activate_battery");
    run(game, ticks(2) + 1);
    expect(vee.hp).toBe(100);
    expect(vee.res.battery).toBe(26);
    expect(vee.cooldowns.remaining("activate_battery", game.now)).toBeGreaterThan(ticks(74));
  });

  it("stops when the battery empties; a last 1% still heals a full HP", () => {
    const { game, vee } = vmatch();
    vee.hp = 50;
    vee.res.battery = 3;
    useAbility(game, vee, "activate_battery");
    run(game, ticks(5));
    expect(vee.hp).toBe(52);
    expect(vee.res.battery).toBe(0);
    expect(vee.cooldowns.remaining("activate_battery", game.now)).toBeGreaterThan(ticks(70));
  });

  it("any HP damage (also damage over time) stops it; overheal-only hits do not", () => {
    const { game, vee, killer } = vmatch();
    vee.hp = 60;
    game.shield(vee, "test", 10);
    useAbility(game, vee, "activate_battery");
    run(game, ticks(1));
    game.damage(vee, 5, killer);
    expect(vee.data("activate_battery").active).toBe(true);
    run(game, ticks(1));
    expect(vee.hp).toBe(62);
    vee.shields = [];
    game.status(vee, "burning", 1, 3, killer);
    run(game, ticks(0.6));
    expect(vee.data("activate_battery").active).toBe(false);
    expect(vee.cooldowns.remaining("activate_battery", game.now)).toBeGreaterThan(ticks(74));
  });

  it("pressing again stops it (75 s cooldown)", () => {
    const { game, vee } = vmatch();
    vee.hp = 60;
    useAbility(game, vee, "activate_battery");
    run(game, ticks(1));
    expect(useAbility(game, vee, "activate_battery").ok).toBe(true);
    expect(vee.data("activate_battery").active).toBe(false);
    expect(vee.cooldowns.remaining("activate_battery", game.now)).toBe(ticks(75));
  });
});

describe("Veeronica — Vandalism", () => {
  it("needs a wall in front within spray range", () => {
    const { game, vee } = vmatch();
    place(vee, cellPos(40, 54));
    face(vee, PZ);
    expect(useAbility(game, vee, "vandalism")).toEqual({ ok: false, reason: "face a wall" });
    place(vee, { x: 38.5, y: 100, z: 52.5 });
    face(vee, NZ); // wall 3.5 blocks away: too far
    expect(useAbility(game, vee, "vandalism").reason).toBe("face a wall");
    // Must face the wall within ~50° of its normal.
    place(vee, { x: 38.5, y: 100, z: 49.4 });
    face(vee, { x: 1, y: 0, z: -0.7 }); // ~55° off
    expect(useAbility(game, vee, "vandalism").reason).toBe("face a wall");
    face(vee, { x: 1, y: 0, z: -1.5 }); // ~34° off
    expect(useAbility(game, vee, "vandalism").ok).toBe(true);
  });

  it("5 s of standing still sprays a 5 HP graffiti the killer can hit; its zone is only shown to her", () => {
    const { game, vee, ports, killer } = vmatch();
    place(vee, RUIN_SOUTH);
    face(vee, NZ);
    expect(useAbility(game, vee, "vandalism").ok).toBe(true);
    expect(vee.cooldowns.remaining("vandalism", game.now)).toBe(ticks(0.7));
    run(game, ticks(5) - 1);
    expect(graffitiOf(game, vee).length).toBe(0);
    run(game, 2);
    const [g] = graffitiOf(game, vee);
    expect(g).toBeDefined();
    expect(g.hp).toBe(5);
    expect(g.targetableBy).toBe("killer");
    expect(ports.props.some((p) => p.kind === "graffiti" && !p.removed)).toBe(true);
    expect(g.pos.z).toBeGreaterThan(48.9);
    expect(g.pos.z).toBeLessThan(49.05);
    expect(zoneAt(game, vee)).toBe(g);
    game.fx.drain();
    run(game, 20);
    const lines = game.fx.drain().filter((e) => e.t === "line");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((e) => e.t === "line" && e.viewers?.length === 1 && e.viewers[0] === vee.id)).toBe(true);
    expect(abilityHudText(game, vee, vee.ability("vandalism")!).label).toContain("1/3");
    void killer;
  });

  it("moving cancels the spray (bots too); pressing again stops it", () => {
    const { game, vee } = vmatch();
    place(vee, RUIN_SOUTH);
    face(vee, NZ);
    useAbility(game, vee, "vandalism");
    run(game, ticks(2));
    place(vee, { x: 38.5, y: 100, z: 51.5 });
    run(game, ticks(4));
    expect(vee.channel).toBeNull();
    expect(graffitiOf(game, vee).length).toBe(0);
    place(vee, RUIN_SOUTH);
    useAbility(game, vee, "vandalism");
    run(game, ticks(1));
    expect(useAbility(game, vee, "vandalism").ok).toBe(true); // release
    expect(vee.channel).toBeNull();
    run(game, ticks(5));
    expect(graffitiOf(game, vee).length).toBe(0);
  });

  it("at most 3 graffiti: a 4th replaces the oldest", () => {
    const { game, vee } = vmatch();
    const a = spray(game, vee, { x: 36.5, y: 100, z: 50.5 }, NZ);
    spray(game, vee, { x: 39.5, y: 100, z: 50.5 }, NZ);
    spray(game, vee, { x: 42.5, y: 100, z: 50.5 }, NZ);
    expect(graffitiOf(game, vee).length).toBe(3);
    spray(game, vee, OUTER, PZ);
    const list = graffitiOf(game, vee);
    expect(list.length).toBe(3);
    expect(list).not.toContain(a);
    expect(a.dead).toBe(true);
  });

  it("cannot be placed within spray range of another one in sight", () => {
    const { game, vee } = vmatch();
    spray(game, vee, { x: 37.5, y: 100, z: 50.5 }, NZ);
    place(vee, { x: 39.5, y: 100, z: 51.4 });
    face(vee, NZ);
    expect(useAbility(game, vee, "vandalism").reason).toBe("too close to graffiti");
  });

  it("pressing next to her own graffiti erases it in 0.5 s (no lockout)", () => {
    const { game, vee } = vmatch();
    const g = spray(game, vee, RUIN_SOUTH, NZ);
    face(vee, PZ);
    expect(useAbility(game, vee, "vandalism").ok).toBe(true);
    run(game, ticks(0.5) + 1);
    expect(g.dead).toBe(true);
    expect(vee.cooldowns.remaining("vandalism", game.now)).toBeLessThan(ticks(1));
  });

  it("the killer destroying one also destroys her graffiti within 4.5 studs and locks Vandalism for 10 s", () => {
    const { game, vee, killer } = vmatch();
    const south = spray(game, vee, RUIN_SOUTH, NZ);
    // Other side of the same wall (behind a wall, so the spacing rule allows it).
    const north = spray(game, vee, { x: 38.5, y: 100, z: 46.5 }, PZ);
    const far = spray(game, vee, OUTER, PZ);
    expect(graffitiOf(game, vee).length).toBe(3);
    place(killer, { x: 38.5, y: 100, z: 51.6 });
    face(killer, NZ);
    useAbility(game, killer, "slash");
    run(game, ticks(0.2) + 1);
    expect(south.dead).toBe(true);
    expect(north.dead).toBe(true);
    expect(far.dead).toBe(false);
    const cd = vee.cooldowns.remaining("vandalism", game.now);
    expect(cd).toBeGreaterThan(ticks(9.5));
    expect(useAbility(game, vee, "vandalism").ok).toBe(false);
  });
});

describe("Veeronica — Sk8", () => {
  it("only starts inside one of her graffiti zones", () => {
    const { game, vee } = vmatch();
    place(vee, SKATE_ROW);
    expect(useAbility(game, vee, "sk8")).toEqual({ ok: false, reason: "not in a graffiti zone" });
    spray(game, vee, OUTER, PZ);
    place(vee, { x: 20.5, y: 100, z: 79.3 });
    expect(useAbility(game, vee, "sk8").reason).toBe("not in a graffiti zone");
    place(vee, SKATE_ROW);
    expect(abilityHudText(game, vee, vee.ability("sk8")!).label).toContain("ZONE");
    expect(useAbility(game, vee, "sk8").ok).toBe(true);
  });

  it("skates in the camera direction at 1.15x sprint speed and drains 13.5 stamina/s", () => {
    const { game, vee } = vmatch();
    startSkating(game, vee);
    expect(vee.forced?.id).toBe("sk8");
    expect(vee.forced!.dir).toEqual(flat(PX));
    expect(vee.forced!.speed).toBeCloseTo(blocksPerSecond(26 * 1.15) / 20, 5);
    const x0 = vee.pos.x;
    run(game, 20);
    expect(vee.pos.x - x0).toBeCloseTo(blocksPerSecond(29.9), 1);
    expect(vee.stamina).toBeCloseTo(100 - 13.5, 0);
    expect(sk8Data(vee).active).toBe(true);
  });

  it("Speed and Slowness scale the skating speed", () => {
    const { game, vee, killer } = vmatch();
    startSkating(game, vee);
    game.status(vee, "slowness", 2, 5, killer);
    run(game, 2);
    expect(vee.forced!.speed).toBeCloseTo((blocksPerSecond(29.9) / 20) * 0.8, 5);
    expect(skateSpeed(game, vee)).toBeCloseTo((blocksPerSecond(29.9) / 20) * 0.8, 5);
  });

  it("steering is limited to a few degrees per tick", () => {
    const { game, vee } = vmatch();
    startSkating(game, vee);
    face(vee, { x: 0, y: 0, z: -1 }); // look 90° to the side
    run(game, 5);
    const d = vee.forced!.dir;
    const deg = (Math.atan2(-d.z, d.x) * 180) / Math.PI;
    expect(deg).toBeGreaterThan(10);
    expect(deg).toBeLessThan(20);
  });

  it("ends when stamina runs out, without exhaustion", () => {
    const { game, vee } = vmatch();
    startSkating(game, vee);
    vee.stamina = 1;
    run(game, 3);
    expect(sk8Data(vee).active).toBe(false);
    expect(vee.forced).toBeNull();
    expect(vee.exhausted).toBe(false);
  });

  it("crashing into a wall: 5 self damage, Slowness IV 2.5 s, Sk8 ends", () => {
    const { game, vee } = vmatch();
    spray(game, vee, RUIN_SOUTH, NZ);
    useAbility(game, vee, "sk8");
    run(game, 10);
    expect(sk8Data(vee).active).toBe(false);
    expect(vee.hp).toBe(95);
    expect(vee.statuses.level("slowness")).toBe(4);
    expect(vee.statuses.remainingTicks("slowness", game.now)).toBeGreaterThan(ticks(2));
    // Too slowed to skate again until the crash slow wears off.
    place(vee, RUIN_SOUTH);
    face(vee, { x: 0, y: 0, z: 1 });
    expect(useAbility(game, vee, "sk8")).toEqual({ ok: false, reason: "slowed" });
    run(game, ticks(2.5));
    expect(useAbility(game, vee, "sk8").ok).toBe(true);
  });

  it("crash damage is absorbed by 5+ overheal", () => {
    const { game, vee } = vmatch();
    spray(game, vee, RUIN_SOUTH, NZ);
    game.shield(vee, "plasma", 10);
    useAbility(game, vee, "sk8");
    run(game, 10);
    expect(vee.hp).toBe(100);
    expect(vee.shield("plasma")?.amount).toBeCloseTo(5);
  });

  it("Trick near a wall: hop, +4 stamina, crash immunity (bounces off the wall), 1.42x speed in the air", () => {
    const { game, vee } = vmatch();
    spray(game, vee, RUIN_SOUTH, NZ);
    useAbility(game, vee, "sk8");
    vee.stamina = 50;
    jump(vee);
    run(game, 1);
    const d = sk8Data(vee);
    expect((vee.body as FakeBody).impulses.some((v) => v.y > 0.3)).toBe(true);
    expect(vee.stamina).toBeGreaterThan(53);
    expect(d.immuneUntil as number).toBeGreaterThan(game.now);
    expect(vee.forced!.speed).toBeCloseTo((blocksPerSecond(29.9) / 20) * 1.42, 5);
    run(game, 8);
    expect(d.active).toBe(true);
    expect(vee.hp).toBe(100);
    expect(vee.forced!.dir.z).toBeGreaterThan(0.9); // bounced back from the wall
    run(game, ticks(1));
    expect(vee.forced!.speed).toBeCloseTo(blocksPerSecond(29.9) / 20, 5);
  });

  it("a Trick on nothing does nothing but still uses the 1 s cooldown", () => {
    const { game, vee } = vmatch();
    spray(game, vee, RUIN_SOUTH, NZ);
    face(vee, PZ); // open floor ahead, wall behind
    useAbility(game, vee, "sk8");
    run(game, 2);
    const st = vee.stamina;
    jump(vee);
    run(game, 1);
    const d = sk8Data(vee);
    expect(vee.stamina).toBeLessThan(st);
    expect(d.immuneUntil).toBe(0);
    expect(d.trickReady as number).toBeGreaterThan(game.now + 15);
  });

  it("3 Tricks in a row give +5% battery", () => {
    const { game, vee } = vmatch();
    startSkating(game, vee); // outer wall beside her the whole way
    for (let i = 0; i < 3; i++) {
      jump(vee);
      run(game, ticks(1) + 1);
    }
    expect(sk8Data(vee).tricks).toBe(3);
    expect(vee.res.battery).toBe(35);
    expect(sk8Data(vee).active).toBe(true);
  });

  it("pressing again cancels it: 5 s cooldown, also while Helpless", () => {
    const { game, vee, killer } = vmatch();
    startSkating(game, vee);
    run(game, 5);
    game.status(vee, "helpless", 1, 5, killer);
    expect(useAbility(game, vee, "sk8").ok).toBe(true);
    expect(sk8Data(vee).active).toBe(false);
    expect(vee.forced).toBeNull();
    expect(vee.cooldowns.remaining("sk8", game.now)).toBe(ticks(5));
  });

  it("a stun or a heavy slow knocks her out of Sk8", () => {
    const { game, vee, killer } = vmatch();
    startSkating(game, vee);
    run(game, 3);
    game.stun(vee, 1, killer);
    run(game, 1);
    expect(sk8Data(vee).active).toBe(false);
    run(game, ticks(1.5));
    place(vee, SKATE_ROW);
    face(vee, PX);
    expect(useAbility(game, vee, "sk8").ok).toBe(true);
    run(game, 2);
    game.status(vee, "slowness", 5, 3, killer);
    run(game, 1);
    expect(sk8Data(vee).active).toBe(false);
  });

  it("starting highlights the zone to her and the killer for 2 s", () => {
    const { game, vee, killer } = vmatch();
    spray(game, vee, OUTER, PZ);
    place(vee, SKATE_ROW);
    face(vee, PX);
    game.fx.drain();
    useAbility(game, vee, "sk8");
    run(game, 20);
    const shown = game.fx.drain().filter((e) => e.t === "line" && e.viewers?.includes(killer.id));
    expect(shown.length).toBeGreaterThan(0);
    run(game, ticks(2));
    game.fx.drain();
    run(game, 20);
    expect(game.fx.drain().some((e) => e.t === "line" && e.viewers?.includes(killer.id))).toBe(false);
  });

  it("Phase: passes through the killer with Resistance II 3 s + Speed II 1.5 s, +15% battery once per Sk8", () => {
    const { game, vee, killer } = vmatch();
    startSkating(game, vee);
    place(killer, { x: 9.5, y: 100, z: 79.3 });
    run(game, ticks(0.6));
    expect(sk8Data(vee).active).toBe(true);
    expect(vee.pos.x).toBeGreaterThan(9.5);
    expect(vee.statuses.level("resistance")).toBe(2);
    expect(vee.statuses.level("speed")).toBe(2);
    expect(vee.res.battery).toBe(45);
    expect(vee.hp).toBe(100);
    // Speed II makes her 20% faster.
    expect(vee.forced!.speed).toBeCloseTo((blocksPerSecond(29.9) / 20) * 1.2, 5);
    place(killer, { x: vee.pos.x + 1.5, y: 100, z: 79.3 });
    run(game, 10);
    expect(vee.res.battery).toBe(45);
    expect(sk8Data(vee).active).toBe(true);
  });

  it("Bumper: knocks the killer back for 5 damage, +15% battery, ends Sk8; 20 s per-killer lockout", () => {
    const { game, vee, killer } = vmatch();
    useAbility(game, vee, "broadcast");
    expect(broadcastMode(vee)).toBe("bumper");
    startSkating(game, vee);
    place(killer, { x: 9.5, y: 100, z: 79.3 });
    const hp = killer.hp;
    run(game, ticks(0.6));
    expect(killer.hp).toBeCloseTo(hp - 5);
    expect((killer.body as FakeBody).impulses.length).toBeGreaterThan(0);
    expect(vee.res.battery).toBe(45);
    expect(vee.hp).toBe(100);
    expect(sk8Data(vee).active).toBe(false);
    expect(abilityHudText(game, vee, vee.ability("broadcast")!).label).toMatch(/Bumper §c\d+s/);
    // Within the lockout the killer is just a crash.
    run(game, ticks(1));
    place(vee, SKATE_ROW);
    face(vee, PX);
    place(killer, { x: 9.5, y: 100, z: 79.3 });
    expect(useAbility(game, vee, "sk8").ok).toBe(true);
    run(game, ticks(0.6));
    expect(killer.hp).toBeCloseTo(hp - 5);
    expect(vee.hp).toBe(95);
    expect(vee.statuses.level("slowness")).toBe(4);
    expect(sk8Data(vee).active).toBe(false);
  });

  it("Mobile: better steering for 2 s after a Trick; the killer is a normal crash", () => {
    const { game, vee, killer } = vmatch();
    useAbility(game, vee, "broadcast");
    run(game, ticks(0.6));
    useAbility(game, vee, "broadcast");
    expect(broadcastMode(vee)).toBe("mobile");
    startSkating(game, vee);
    run(game, 1);
    expect(vee.forced!.turnRate).toBe(3);
    jump(vee);
    run(game, 1);
    expect(vee.forced!.turnRate).toBe(7);
    run(game, ticks(2) + 1);
    expect(vee.forced!.turnRate).toBe(3);
    place(killer, { x: vee.pos.x + 1.5, y: 100, z: 79.3 });
    run(game, 10);
    expect(vee.hp).toBe(95);
    expect(sk8Data(vee).active).toBe(false);
  });

  it("crash immunity from a Trick also covers the killer", () => {
    const { game, vee, killer } = vmatch();
    useAbility(game, vee, "broadcast");
    run(game, ticks(0.6));
    useAbility(game, vee, "broadcast"); // mobile
    startSkating(game, vee);
    place(killer, { x: 8.5, y: 100, z: 79.3 });
    jump(vee);
    run(game, 8);
    expect(vee.pos.x).toBeGreaterThan(8.5);
    expect(vee.hp).toBe(100);
    expect(sk8Data(vee).active).toBe(true);
  });
});

describe("Veeronica — Broadcast", () => {
  it("cycles Phase → Bumper → Mobile, shows the mode, and cannot switch during Sk8", () => {
    const { game, vee } = vmatch();
    expect(broadcastMode(vee)).toBe("phase");
    expect(abilityHudText(game, vee, vee.ability("broadcast")!).label).toContain("Phase");
    useAbility(game, vee, "broadcast");
    expect(vee.cooldowns.remaining("broadcast", game.now)).toBe(ticks(0.5));
    run(game, ticks(0.5));
    useAbility(game, vee, "broadcast");
    expect(broadcastMode(vee)).toBe("mobile");
    run(game, ticks(0.5));
    useAbility(game, vee, "broadcast");
    expect(broadcastMode(vee)).toBe("phase");
    run(game, ticks(0.5));
    startSkating(game, vee);
    expect(useAbility(game, vee, "broadcast")).toEqual({ ok: false, reason: "skating" });
  });
});

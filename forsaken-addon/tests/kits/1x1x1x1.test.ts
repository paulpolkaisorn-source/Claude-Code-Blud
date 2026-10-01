import { afterEach, describe, expect, it } from "vitest";
import { body, cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { studs, ticks } from "../../src/core/scale";
import { zombiesOf } from "../../src/abilities/kits/1x1x1x1";
import type { Game } from "../../src/core/game";
import type { Actor } from "../../src/entities/actor";
import { dist2D, flat, len2D, scale, sub } from "../../src/util/vec";

afterEach(() => resetConfig());

function duel(survivors = ["elliot", "elliot", "elliot"]) {
  const m = realMatch("1x1x1x1", survivors);
  faceTo(m.killer, m.survivors[0]);
  return m;
}

/** A match where survivor 2 died at (20, 72) and rose as a zombie. */
function withZombie() {
  const m = duel();
  const { game, killer, survivors } = m;
  place(survivors[2], cellPos(20, 72));
  place(survivors[1], cellPos(10, 60));
  game.damage(survivors[2], 1000, killer);
  expect(killer.res.rotCharges).toBe(1);
  expect(useAbility(game, killer, "rejuvenate_the_rotten").ok).toBe(true);
  run(game, ticks(3.5) + 1);
  const zombie = zombiesOf(game, killer)[0];
  return { ...m, zombie };
}

/** Ticks while moving minions along their input like the adapter does. */
function step(game: Game, n: number): void {
  for (let i = 0; i < n; i++) {
    for (const a of game.actors) {
      if (!a.isMinion || !a.alive || !a.input.moveDir || a.frozen) continue;
      body(a).drive(scale(a.input.moveDir, (a.input.wantSprint ? a.sprintBps : a.walkBps) / 20));
    }
    game.tick();
  }
}

function damageFrom(t: Actor, abilityId: string): { total: number } {
  const acc = { total: 0 };
  t.addHooks("test", { afterTakeDamage: (_s, ev) => void (ev.abilityId === abilityId && (acc.total += ev.dealt)) });
  return acc;
}

describe("1x1x1x1", () => {
  it("Slash: 20 damage + Glitched I and Poisoned I for 5 s", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    useAbility(game, killer, "slash");
    run(game, ticks(0.4) + 1);
    expect(s.hp).toBeCloseTo(60);
    expect(s.statuses.level("glitched")).toBe(1);
    expect(s.statuses.level("poisoned")).toBe(1);
    expect(s.statuses.remainingTicks("glitched", game.now)).toBeGreaterThan(ticks(4.9));
    expect(killer.cooldowns.remaining("slash", game.now)).toBeGreaterThan(0);
  });

  describe("Mass Infection", () => {
    it("1.7 s heavily slowed windup, then close hits (+25, Glitched II, Poisoned V, Speed) and a wall-piercing wave (30, Glitched I, Poisoned I); aura 12 s", () => {
      const { game, killer, survivors } = duel();
      const [close, far, behind] = survivors;
      place(far, cellPos(40, 61)); // behind the wall at z = 58
      place(behind, cellPos(40, 44)); // 6 blocks behind him: outside the close hitbox
      const closeDmg = damageFrom(close, "mass_infection");
      const farDmg = damageFrom(far, "mass_infection");
      run(game, 1);
      const walk = killer.walkBps;
      useAbility(game, killer, "mass_infection");
      run(game, 2);
      expect(killer.walkBps).toBeCloseTo(walk * 0.2);
      expect(killer.canSprint).toBe(false);
      run(game, ticks(1.7) - 3);
      expect(closeDmg.total).toBe(0);
      run(game, 1);
      expect(closeDmg.total).toBe(55);
      expect(close.statuses.level("glitched")).toBe(2);
      expect(close.statuses.level("poisoned")).toBe(5);
      expect(close.statuses.remainingTicks("speed", game.now)).toBeGreaterThan(ticks(2.9));
      expect(killer.canSprint).toBe(true);
      run(game, ticks(1));
      expect(farDmg.total).toBe(30);
      expect(far.statuses.level("glitched")).toBe(1);
      expect(far.statuses.level("poisoned")).toBe(1);
      for (const s of [close, far]) expect(game.isRevealedTo(s, killer)).toBe(true);
      expect(behind.hp).toBe(80);
      run(game, ticks(11.5));
      expect(game.isRevealedTo(far, killer)).toBe(false);
    });

    it("+10 damage against Glitched survivors", () => {
      const { game, killer, survivors } = duel();
      const far = survivors[1];
      place(far, cellPos(40, 61));
      game.status(far, "glitched", 1, 10, killer);
      const dmg = damageFrom(far, "mass_infection");
      useAbility(game, killer, "mass_infection");
      run(game, ticks(1.7) + ticks(1));
      expect(dmg.total).toBe(40);
    });

    it("a stun during the windup cancels it; a stunned 1x has no wave hitbox", () => {
      const { game, killer, survivors } = duel();
      useAbility(game, killer, "mass_infection");
      run(game, 10);
      game.stun(killer, 1, survivors[0]);
      run(game, ticks(3));
      expect(survivors[0].hp).toBe(80);
      expect(game.objectsOf("mass_infection_wave")).toHaveLength(0);

      const m2 = duel();
      place(m2.survivors[1], cellPos(40, 75));
      useAbility(m2.game, m2.killer, "mass_infection");
      run(m2.game, ticks(1.7) + 1);
      m2.game.stun(m2.killer, 3, m2.survivors[0]);
      run(m2.game, ticks(2));
      expect(m2.survivors[1].hp).toBe(80);
    });

    it("cannot hurt his own zombies", () => {
      const { game, killer, zombie } = withZombie();
      place(killer, { ...zombie.pos, z: zombie.pos.z - 3 });
      faceTo(killer, zombie);
      useAbility(game, killer, "mass_infection");
      run(game, ticks(2.5));
      expect(zombie.alive).toBe(true);
      expect(zombie.hp).toBe(25);
    });
  });

  describe("Entanglement", () => {
    it("0.75 s windup; the sword deals 10, aura 12 s, Helpless + Glitched II 6 s, Slowness X 1 s and pulls toward him", () => {
      const { game, killer, survivors } = duel();
      const s = survivors[0];
      useAbility(game, killer, "entanglement");
      run(game, ticks(0.75) - 1);
      expect(s.hp).toBe(80);
      run(game, 3);
      expect(s.hp).toBe(70);
      expect(game.isRevealedTo(s, killer)).toBe(true);
      expect(s.statuses.has("helpless")).toBe(true);
      expect(s.statuses.remainingTicks("helpless", game.now)).toBeGreaterThan(ticks(5.8));
      expect(s.statuses.level("glitched")).toBe(2);
      expect(s.statuses.level("slowness")).toBe(10);
      expect(s.statuses.remainingTicks("slowness", game.now)).toBeLessThanOrEqual(ticks(1));
      const pull = body(s).impulses.at(-1)!;
      expect(pull.z).toBeLessThan(0); // toward 1x (he is to the north)
      expect(useAbility(game, s, "pizza_throw").reason).toBe("helpless");
    });

    it("pulls 50% harder when the survivor is already Glitched", () => {
      const a = duel();
      useAbility(a.game, a.killer, "entanglement");
      run(a.game, ticks(0.75) + 2);
      const normal = len2D(body(a.survivors[0]).impulses.at(-1)!);
      const b = duel();
      b.game.status(b.survivors[0], "glitched", 1, 10, b.killer);
      useAbility(b.game, b.killer, "entanglement");
      run(b.game, ticks(0.75) + 2);
      const glitched = len2D(body(b.survivors[0]).impulses.at(-1)!);
      expect(glitched / normal).toBeCloseTo(1.5);
    });

    it("12 pop-ups: the victim closes them by pressing jump", () => {
      const { game, killer, survivors } = duel();
      const s = survivors[0];
      useAbility(game, killer, "entanglement");
      run(game, ticks(0.75) + 2);
      expect(s.res.oneXPopups).toBe(12);
      s.input.jumpPresses += 5;
      run(game, 1);
      expect(s.res.oneXPopups).toBe(7);
      s.input.jumpPresses += 9;
      run(game, 1);
      expect(s.res.oneXPopups).toBe(0);
    });

    it("kills his own zombie instantly (100 damage) and gives him Speed I 8 s", () => {
      const { game, killer, zombie } = withZombie();
      place(killer, { ...zombie.pos, z: zombie.pos.z - 4 });
      faceTo(killer, zombie);
      useAbility(game, killer, "entanglement");
      run(game, ticks(0.75) + 3);
      expect(zombie.alive).toBe(false);
      expect(killer.statuses.level("speed")).toBe(1);
      expect(killer.statuses.remainingTicks("speed", game.now)).toBeGreaterThan(ticks(7.8));
    });
  });

  it("Unstable Eye: starts the round on 12.5 s; 1.5 s startup (no sprint), then all auras 8 s, Speed II 1.5 s and Blindness III 7 s on himself", () => {
    const { game, killer, survivors } = duel();
    expect(killer.cooldowns.remaining("unstable_eye", game.now) / 20).toBeGreaterThan(12.3);
    expect(useAbility(game, killer, "unstable_eye").ok).toBe(false);
    killer.cooldowns.reset("unstable_eye");
    expect(useAbility(game, killer, "unstable_eye").ok).toBe(true);
    run(game, 2);
    expect(killer.canSprint).toBe(false);
    expect(killer.walkBps).toBeGreaterThan(0);
    run(game, ticks(1.5) - 2);
    for (const s of survivors) expect(game.isRevealedTo(s, killer)).toBe(true);
    expect(killer.statuses.level("speed")).toBe(2);
    expect(killer.statuses.level("blindness")).toBe(3);
    expect(killer.statuses.remainingTicks("blindness", game.now)).toBeGreaterThan(ticks(6.9));
    expect(killer.canSprint).toBe(false);
    run(game, ticks(0.35) + 1);
    expect(killer.canSprint).toBe(true);
    run(game, ticks(8));
    for (const s of survivors) expect(game.isRevealedTo(s, killer)).toBe(false);
    expect(killer.cooldowns.remaining("unstable_eye", game.now) / 20).toBeGreaterThan(14);
  });

  describe("Rejuvenate the Rotten", () => {
    it("needs a kill charge (max 1) and raises zombies (25 HP) where survivors died, even through a stun", () => {
      const { game, killer, survivors } = duel();
      expect(useAbility(game, killer, "rejuvenate_the_rotten").reason).toBe("no charge");
      place(survivors[1], cellPos(20, 72));
      place(survivors[2], cellPos(30, 72));
      game.damage(survivors[1], 1000, killer);
      game.damage(survivors[2], 1000, killer);
      expect(killer.res.rotCharges).toBe(1);
      expect(useAbility(game, killer, "rejuvenate_the_rotten").ok).toBe(true);
      expect(killer.res.rotCharges).toBe(0);
      run(game, 10);
      game.stun(killer, 1, survivors[0]);
      run(game, ticks(3.5));
      const zs = zombiesOf(game, killer);
      expect(zs).toHaveLength(2);
      expect(zs.every((z) => z.hp === 25 && z.team === "killer" && z.isMinion)).toBe(true);
      expect(zs.some((z) => dist2D(z.pos, cellPos(20, 72)) < 1)).toBe(true);
      expect(zs.some((z) => z.displayName.includes(survivors[1].displayName))).toBe(true);
      // Green aura visible to 1x only.
      run(game, 20);
      expect(game.isRevealedTo(zs[0], killer)).toBe(true);
      expect(game.isRevealedTo(zs[0], survivors[0])).toBe(false);
      // Nothing left to raise.
      killer.res.rotCharges = 1;
      killer.cooldowns.reset("rejuvenate_the_rotten");
      expect(useAbility(game, killer, "rejuvenate_the_rotten").reason).toBe("no corpses");
    });

    it("zombie touch: Poisoned I + Glitched I 8 s and aura 8 s; 5 damage only to Glitched survivors", () => {
      const { game, killer, survivors, zombie } = withZombie();
      const s = survivors[1];
      const zdmg = damageFrom(s, "rejuvenate_the_rotten");
      place(s, { ...zombie.pos, x: zombie.pos.x + 0.6 });
      run(game, 1);
      expect(s.statuses.level("poisoned")).toBe(1);
      expect(s.statuses.level("glitched")).toBe(1);
      expect(s.statuses.remainingTicks("glitched", game.now)).toBeGreaterThan(ticks(7.9));
      expect(game.isRevealedTo(s, killer)).toBe(true);
      expect(zdmg.total).toBe(0);
      run(game, ticks(1.5));
      expect(zdmg.total).toBe(5);
    });

    it("zombies can only kill Glitched survivors", () => {
      const { game, survivors, zombie } = withZombie();
      const s = survivors[1];
      s.hp = 3;
      place(s, { ...zombie.pos, x: zombie.pos.x + 0.6 });
      run(game, 1);
      expect(s.alive).toBe(true);
      run(game, ticks(1.5));
      expect(s.alive).toBe(false);
    });

    it("zombie AI: chases survivors within 20 studs, gives up beyond 30 studs, ignores Undetectable", () => {
      const { game, killer, survivors, zombie } = withZombie();
      const s = survivors[1];
      const state = () => (killer.data("rejuvenate_the_rotten").zombies as Array<{ aggro: string | null }>)[0];
      place(s, { ...zombie.pos, x: zombie.pos.x + studs(18) });
      run(game, 1);
      const dir = zombie.input.moveDir!;
      const to = flat(sub(s.pos, zombie.pos));
      expect(dir.x * to.x + dir.z * to.z).toBeGreaterThan(0.9);
      expect(state().aggro).toBe(s.id);
      step(game, ticks(1));
      expect(dist2D(zombie.pos, s.pos)).toBeLessThan(studs(18) - 1);
      // Out of range: back to wandering.
      place(s, { ...zombie.pos, x: zombie.pos.x + studs(32) });
      step(game, 2);
      expect(state().aggro).toBeNull();
      // Undetectable survivors are ignored even up close.
      game.status(s, "undetectable", 1, 10, s);
      place(s, { ...zombie.pos, x: zombie.pos.x + 0.6 });
      run(game, 2);
      expect(s.statuses.has("glitched")).toBe(false);
    });

    it("1x can cut down his own zombies with Slash for Speed I 8 s; survivors can kill them too", () => {
      const { game, killer, survivors, zombie } = withZombie();
      place(killer, { ...zombie.pos, z: zombie.pos.z - 2 });
      faceTo(killer, zombie);
      useAbility(game, killer, "slash");
      run(game, ticks(0.4) + 1);
      expect(zombie.hp).toBe(5);
      killer.cooldowns.reset("slash");
      useAbility(game, killer, "slash");
      run(game, ticks(0.4) + 1);
      expect(zombie.alive).toBe(false);
      expect(killer.statuses.level("speed")).toBe(1);
      expect(zombiesOf(game, killer)).toHaveLength(0);

      const m = withZombie();
      expect(m.game.enemiesOf(m.survivors[0]).includes(m.zombie)).toBe(true);
      m.game.damage(m.zombie, 25, m.survivors[0]);
      expect(m.zombie.alive).toBe(false);
      void survivors;
    });
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { ticks } from "../../src/core/scale";
import { pizzaHotHeal } from "../../src/abilities/kits/elliot";

afterEach(() => resetConfig());

describe("Elliot", () => {
  it("Pizza Throw heals another survivor 5 now + 15 over time and grants a Rush Hour charge", () => {
    const { game, killer, survivors } = realMatch("slasher", ["elliot", "noob"]);
    const [elliot, noob] = survivors;
    place(elliot, cellPos(40, 60));
    place(noob, cellPos(40, 63));
    place(killer, cellPos(70, 10));
    faceTo(elliot, noob);
    noob.hp = 50;
    expect(useAbility(game, elliot, "pizza_throw").ok).toBe(true);
    const pizza = game.objectsOf("pizza")[0];
    place(noob, pizza.pos);
    run(game, ticks(6));
    expect(noob.hp).toBeCloseTo(70, 0);
    expect(elliot.res.rushCharges).toBe(2);
  });
  it("Order Up! adds +2 per repaired generator (max +10)", () => {
    const { game, survivors } = realMatch("slasher", ["elliot"]);
    expect(pizzaHotHeal(game, survivors[0])).toBe(15);
    game.round.generatorsDone = 3;
    expect(pizzaHotHeal(game, survivors[0])).toBe(21);
    game.round.generatorsDone = 9;
    expect(pizzaHotHeal(game, survivors[0])).toBe(25);
  });
  it("Pizza cannot heal Veeronica or Elliot himself", () => {
    const { game, killer, survivors } = realMatch("slasher", ["elliot", "veeronica"]);
    const [elliot, vee] = survivors;
    place(killer, cellPos(70, 10));
    elliot.hp = 40;
    vee.hp = 40;
    useAbility(game, elliot, "pizza_throw");
    const pizza = game.objectsOf("pizza")[0];
    place(vee, pizza.pos);
    place(elliot, pizza.pos);
    run(game, 20);
    expect(vee.hp).toBe(40);
    expect(elliot.hp).toBe(40);
  });
  it("Rush Hour near the killer spends all charges for Speed (level = charges); 2+ charges then Exhausted II", () => {
    const { game, killer, survivors } = realMatch("slasher", ["elliot"]);
    const elliot = survivors[0];
    place(elliot, cellPos(40, 56));
    place(killer, cellPos(40, 50));
    elliot.res.rushCharges = 3;
    useAbility(game, elliot, "rush_hour");
    expect(elliot.statuses.level("speed")).toBe(3);
    expect(elliot.res.rushCharges).toBe(0);
    run(game, ticks(4) + 2);
    expect(elliot.statuses.level("exhausted")).toBe(2);
  });
  it("Deliverer's Resolve reveals damaged survivors to Elliot for 12 s", () => {
    const { game, killer, survivors } = realMatch("slasher", ["elliot", "noob"]);
    game.damage(survivors[1], 10, killer);
    expect(game.isRevealedTo(survivors[1], survivors[0])).toBe(true);
    run(game, ticks(12) + 1);
    expect(game.isRevealedTo(survivors[1], survivors[0])).toBe(false);
  });
});

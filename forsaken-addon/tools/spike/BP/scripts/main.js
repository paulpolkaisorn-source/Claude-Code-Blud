// M1 technical spike: exercises risky APIs inside a real Bedrock Dedicated Server (no client needed).
// Output lines start with "[spike]" and end with "[spike] DONE".
import { system, world, BlockVolume, TextPrimitive, GameMode } from "@minecraft/server";

const log = (...a) => console.warn("[spike]", ...a);
const results = {};
const ok = (k, v) => {
  results[k] = v;
  log(k, JSON.stringify(v));
};

const ORIGIN = { x: 1000, y: 200, z: 1000 };
let hurtCancelled = 0;
world.beforeEvents.entityHurt.subscribe((ev) => {
  if (ev.hurtEntity.hasTag("virtual")) {
    ev.cancel = true;
    hurtCancelled++;
  }
});

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id === "spike:run") run().catch((e) => log("FAILED", String(e), e?.stack));
});

async function run() {
  const dim = world.getDimension("overworld");
  // 1. ticking area
  const t0 = system.currentTick;
  const opts = { dimension: dim, from: { x: ORIGIN.x - 24, y: 190, z: ORIGIN.z - 24 }, to: { x: ORIGIN.x + 40, y: 230, z: ORIGIN.z + 24 } };
  ok("tickingCapacity", world.tickingAreaManager.hasCapacity(opts));
  await world.tickingAreaManager.createTickingArea("spike:arena", opts);
  ok("tickingAreaLoadedTicks", system.currentTick - t0);
  ok("chunkLoaded", dim.isChunkLoaded(ORIGIN));

  // 2. time-sliced fill with runJob
  await new Promise((resolve) => {
    system.runJob(
      (function* () {
        for (let x = -20; x < 40; x += 10) {
          dim.fillBlocks(new BlockVolume({ x: ORIGIN.x + x, y: ORIGIN.y - 1, z: ORIGIN.z - 20 }, { x: ORIGIN.x + x + 9, y: ORIGIN.y - 1, z: ORIGIN.z + 20 }), "minecraft:stone");
          dim.fillBlocks(new BlockVolume({ x: ORIGIN.x + x, y: ORIGIN.y, z: ORIGIN.z - 20 }, { x: ORIGIN.x + x + 9, y: ORIGIN.y + 5, z: ORIGIN.z + 20 }), "minecraft:air");
          yield;
        }
        resolve();
      })(),
    );
  });
  ok("floorBlock", dim.getBlock({ x: ORIGIN.x, y: ORIGIN.y - 1, z: ORIGIN.z })?.typeId);
  dim.setBlockType({ x: ORIGIN.x + 3, y: ORIGIN.y, z: ORIGIN.z + 3 }, "spike:generator");
  ok("customBlock", dim.getBlock({ x: ORIGIN.x + 3, y: ORIGIN.y, z: ORIGIN.z + 3 })?.typeId);

  // 3. spawn custom entity + property
  const bot = dim.spawnEntity("spike:bot", { x: ORIGIN.x + 0.5, y: ORIGIN.y, z: ORIGIN.z + 0.5 });
  bot.addTag("virtual");
  bot.nameTag = "Spike [BOT]";
  bot.setProperty("forsaken:character", 7);
  await system.waitTicks(2);
  ok("property", bot.getProperty("forsaken:character"));

  // 4. hurt cancel
  const hp0 = bot.getComponent("minecraft:health").currentValue;
  bot.applyDamage(5);
  await system.waitTicks(2);
  ok("hurtCancel", { before: hp0, after: bot.getComponent("minecraft:health").currentValue, cancelled: hurtCancelled });

  // 5. movement attribute on a mob
  const mv = bot.getComponent("minecraft:movement");
  ok("movementDefault", mv.defaultValue);
  mv.setCurrentValue(0.31);
  ok("movementSet", mv.currentValue);
  mv.setCurrentValue(0.25);

  // 6. impulse steering: open loop vs closed loop
  for (const mode of ["open", "closed"]) {
    bot.teleport({ x: ORIGIN.x + 0.5, y: ORIGIN.y, z: ORIGIN.z + 0.5 });
    bot.clearVelocity();
    await system.waitTicks(5);
    const start = bot.location;
    const desired = 0.28; // blocks per tick (vanilla sprint ~5.6 b/s)
    for (let i = 0; i < 40; i++) {
      const v = bot.getVelocity();
      if (mode === "open") {
        bot.applyImpulse({ x: desired - v.x, y: 0, z: -v.z });
      } else {
        bot.applyImpulse({ x: desired * 1.0 - v.x, y: 0, z: -v.z });
      }
      await system.waitTicks(1);
    }
    const end = bot.location;
    ok(`impulse_${mode}`, { dx: +(end.x - start.x).toFixed(3), perTick: +((end.x - start.x) / 40).toFixed(4), dz: +(end.z - start.z).toFixed(3), y: +(end.y - start.y).toFixed(3) });
  }
  // 6b. measure ratio desired vs achieved for several targets (calibration table)
  const table = [];
  for (const desired of [0.1, 0.2, 0.3]) {
    bot.teleport({ x: ORIGIN.x + 0.5, y: ORIGIN.y, z: ORIGIN.z + 0.5 });
    bot.clearVelocity();
    await system.waitTicks(5);
    const sx = bot.location.x;
    for (let i = 0; i < 30; i++) {
      const v = bot.getVelocity();
      bot.applyImpulse({ x: desired - v.x, y: 0, z: -v.z });
      await system.waitTicks(1);
    }
    table.push({ desired, achieved: +((bot.location.x - sx) / 30).toFixed(4) });
  }
  ok("impulseTable", table);

  // 7. knockback on mob
  bot.teleport({ x: ORIGIN.x + 0.5, y: ORIGIN.y, z: ORIGIN.z + 0.5 });
  bot.clearVelocity();
  await system.waitTicks(3);
  const kx = bot.location.x;
  bot.applyKnockback({ x: 1.0, z: 0 }, 0.2);
  await system.waitTicks(20);
  ok("knockback1", +(bot.location.x - kx).toFixed(3));

  // 8. TextPrimitive
  try {
    const tp = new TextPrimitive({ x: 0, y: 2.3, z: 0 }, "AURA");
    tp.attachedTo = bot;
    tp.depthTest = false;
    tp.color = { red: 1, green: 0.2, blue: 0.2, alpha: 1 };
    tp.timeLeft = 5;
    world.primitiveShapesManager.addText(tp, dim);
    ok("textPrimitive", { shapes: world.primitiveShapesManager.getShapes().length, max: world.primitiveShapesManager.maxShapes });
  } catch (e) {
    ok("textPrimitive", "ERROR " + String(e));
  }

  // 9. game rules, time, difficulty
  try {
    world.gameRules.doDayLightCycle = false;
    world.gameRules.doWeatherCycle = false;
    world.gameRules.doMobSpawning = false;
    world.gameRules.naturalRegeneration = false;
    world.gameRules.keepInventory = true;
    world.gameRules.mobGriefing = false;
    world.setTimeOfDay(18000);
    ok("gamerules", { daylight: world.gameRules.doDayLightCycle, regen: world.gameRules.naturalRegeneration, time: world.getTimeOfDay() });
  } catch (e) {
    ok("gamerules", "ERROR " + String(e));
  }

  // 10. raycast + entity query
  const hit = dim.getBlockFromRay({ x: ORIGIN.x + 0.5, y: ORIGIN.y + 0.5, z: ORIGIN.z + 3.5 }, { x: 1, y: 0, z: 0 }, { maxDistance: 10 });
  ok("raycast", hit ? { type: hit.block.typeId, x: hit.block.location.x } : null);
  ok("query", dim.getEntities({ type: "spike:bot", tags: ["virtual"], location: ORIGIN, maxDistance: 10 }).length);

  // 11. particles and sounds with no players (should not throw)
  try {
    dim.spawnParticle("minecraft:basic_flame_particle", { x: ORIGIN.x, y: ORIGIN.y + 1, z: ORIGIN.z });
    dim.playSound("mob.warden.heartbeat", ORIGIN, { volume: 1 });
    ok("fx", "ok");
  } catch (e) {
    ok("fx", "ERROR " + String(e));
  }

  // 12. removing + ticking area removal
  bot.remove();
  world.tickingAreaManager.removeTickingArea("spike:arena");
  ok("cleanup", world.tickingAreaManager.hasTickingArea("spike:arena"));
  ok("gameModes", Object.keys(GameMode));
  log("DONE");
}

// ---- spike 2: doors, jump impulse, steering cost with 9 bots
system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id === "spike:run2") run2().catch((e) => log("FAILED", String(e), e?.stack));
});
async function run2() {
  const dim = world.getDimension("overworld");
  const opts = { dimension: dim, from: { x: ORIGIN.x - 24, y: 190, z: ORIGIN.z - 24 }, to: { x: ORIGIN.x + 40, y: 230, z: ORIGIN.z + 24 } };
  await world.tickingAreaManager.createTickingArea("spike:arena2", opts);
  dim.fillBlocks(new BlockVolume({ x: ORIGIN.x - 20, y: ORIGIN.y - 1, z: ORIGIN.z - 20 }, { x: ORIGIN.x + 39, y: ORIGIN.y - 1, z: ORIGIN.z + 20 }), "minecraft:stone");
  dim.fillBlocks(new BlockVolume({ x: ORIGIN.x - 20, y: ORIGIN.y, z: ORIGIN.z - 20 }, { x: ORIGIN.x + 39, y: ORIGIN.y + 5, z: ORIGIN.z + 20 }), "minecraft:air");
  // door at x+6
  const doorPos = { x: ORIGIN.x + 6, y: ORIGIN.y, z: ORIGIN.z };
  dim.fillBlocks(new BlockVolume({ x: ORIGIN.x + 6, y: ORIGIN.y, z: ORIGIN.z - 5 }, { x: ORIGIN.x + 6, y: ORIGIN.y + 3, z: ORIGIN.z + 5 }), "minecraft:stone_bricks");
  dim.setBlockType(doorPos, "minecraft:air");
  dim.setBlockType({ ...doorPos, y: doorPos.y + 1 }, "minecraft:air");
  // place a door: lower half then upper half
  const BlockPermutation = (await import("@minecraft/server")).BlockPermutation;
  dim.setBlockPermutation(doorPos, BlockPermutation.resolve("minecraft:spruce_door", { upper_block_bit: false, "minecraft:cardinal_direction": "east", open_bit: false }));
  dim.setBlockPermutation({ ...doorPos, y: doorPos.y + 1 }, BlockPermutation.resolve("minecraft:spruce_door", { upper_block_bit: true, "minecraft:cardinal_direction": "east", open_bit: false }));
  const states = dim.getBlock(doorPos).permutation.getAllStates();
  ok("doorStates", states);
  const bot = dim.spawnEntity("spike:bot", { x: ORIGIN.x + 0.5, y: ORIGIN.y, z: ORIGIN.z + 0.5 });
  const walk = async (ticks) => {
    for (let i = 0; i < ticks; i++) {
      const v = bot.getVelocity();
      bot.applyImpulse({ x: 0.2 / 0.695 - v.x, y: 0, z: -v.z });
      await system.waitTicks(1);
    }
    return +bot.location.x.toFixed(2);
  };
  ok("closedDoorStop", await walk(40));
  const b = dim.getBlock(doorPos);
  b.setPermutation(b.permutation.withState("open_bit", true));
  ok("openState", dim.getBlock(doorPos).permutation.getState("open_bit"));
  ok("openedDoorPass", await walk(40));
  // jump: 1-block step
  bot.teleport({ x: ORIGIN.x + 10.5, y: ORIGIN.y, z: ORIGIN.z - 8.5 });
  dim.setBlockType({ x: ORIGIN.x + 13, y: ORIGIN.y, z: ORIGIN.z - 9 }, "minecraft:stone");
  await system.waitTicks(3);
  for (let i = 0; i < 30; i++) {
    const v = bot.getVelocity();
    const blocked = dim.getBlock({ x: Math.floor(bot.location.x + 0.6), y: ORIGIN.y, z: ORIGIN.z - 9 })?.isSolid;
    bot.applyImpulse({ x: 0.15 / 0.695 - v.x, y: blocked && bot.isOnGround ? 0.42 : 0, z: -v.z });
    await system.waitTicks(1);
  }
  ok("jumpStep", { x: +bot.location.x.toFixed(2), y: +(bot.location.y - ORIGIN.y).toFixed(2) });
  // steering cost: 9 bots, 100 ticks
  const bots = [bot];
  for (let i = 0; i < 8; i++) bots.push(dim.spawnEntity("spike:bot", { x: ORIGIN.x - 10 + i * 2 + 0.5, y: ORIGIN.y, z: ORIGIN.z + 10.5 }));
  let total = 0;
  for (let t = 0; t < 100; t++) {
    const s = Date.now();
    for (const e of bots) {
      const v = e.getVelocity();
      const l = e.location;
      const dx = ORIGIN.x - l.x, dz = ORIGIN.z - l.z;
      const d = Math.hypot(dx, dz) || 1;
      e.applyImpulse({ x: (dx / d) * 0.25 / 0.695 - v.x, y: 0, z: (dz / d) * 0.25 / 0.695 - v.z });
      e.setRotation({ x: 0, y: (Math.atan2(-dx, dz) * 180) / Math.PI });
    }
    total += Date.now() - s;
    await system.waitTicks(1);
  }
  ok("steerCostMsPerTick9Bots", total / 100);
  for (const e of bots) e.remove();
  world.tickingAreaManager.removeTickingArea("spike:arena2");
  log("DONE2");
}

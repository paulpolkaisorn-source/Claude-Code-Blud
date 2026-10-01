// FORSAKEN: Bedrock Edition — entry point. Unofficial fan project; not affiliated with or endorsed by
// the FORSAKEN developers or Roblox.
import { ButtonState, EntitySwingSource, InputButton, Player, system, world } from "@minecraft/server";
import { MatchController, log } from "./mc/match.mc";
import { purgeRuntimeEntities } from "./mc/ports.mc";
import { giveMenuItem } from "./mc/inventory.mc";
import { KILLERS, hasCharacter } from "./characters/roster";
import type { Difficulty } from "./core/config";

let controller: MatchController | null = null;

function ctrl(): MatchController {
  if (!controller) controller = new MatchController();
  return controller;
}

world.afterEvents.worldLoad.subscribe(() => {
  const c = ctrl();
  try {
    const n = purgeRuntimeEntities(world.getDimension("overworld"));
    if (n > 0) log(`removed ${n} stray entities from a previous session`);
  } catch (e) {
    log(`cleanup on load failed: ${String(e)}`);
  }
  void c;
  log("FORSAKEN: Bedrock Edition loaded. /scriptevent forsaken:menu to play.");
});

// ---------------------------------------------------------------- commands
system.afterEvents.scriptEventReceive.subscribe((ev) => {
  const player = ev.sourceEntity instanceof Player ? ev.sourceEntity : undefined;
  const args = ev.message.trim().split(/\s+/).filter(Boolean);
  switch (ev.id) {
    case "forsaken:menu":
      if (player) void ctrl().openMenu(player);
      else log("forsaken:menu must be run by a player");
      break;
    case "forsaken:give_menu":
      if (player) giveMenuItem(player);
      break;
    case "forsaken:stop":
      void ctrl().abort("stopped with /scriptevent forsaken:stop");
      break;
    case "forsaken:debug": {
      const on = world.getDynamicProperty("forsaken:debug") !== true;
      world.setDynamicProperty("forsaken:debug", on);
      const text = `[Forsaken] debug ${on ? "ON" : "OFF"}\n${ctrl().debugReport()}`;
      if (player) player.sendMessage(text);
      else log(text);
      break;
    }
    case "forsaken:quickstart": {
      // /scriptevent forsaken:quickstart <killer|survivor> <characterId|random> [easy|normal|hard]
      if (!player) break;
      const role = args[0] === "killer" ? "killer" : "survivor";
      const ch = args[1] && (args[1] === "random" || hasCharacter(args[1])) ? args[1] : "random";
      const diff = (["easy", "normal", "hard"].includes(args[2]) ? args[2] : "normal") as Difficulty;
      void ctrl().quickStart(player, { role, characterId: ch, difficulty: diff, arenaId: "hollow_hamlet" });
      break;
    }
    case "forsaken:selftest": {
      // Bots-only match for automated smoke tests (Bedrock Dedicated Server, no client needed).
      const killer = args[0] && KILLERS.some((k) => k.id === args[0]) ? args[0] : "random";
      const diff = (["easy", "normal", "hard"].includes(args[1]) ? args[1] : "normal") as Difficulty;
      void ctrl().selfTestMatch(killer, diff);
      break;
    }
    default:
      break;
  }
});

// ---------------------------------------------------------------- input
world.afterEvents.itemUse.subscribe((ev) => {
  if (!ev.itemStack.typeId.startsWith("forsaken:")) return;
  ctrl().onItemUse(ev.source, ev.itemStack);
});

world.afterEvents.playerSwingStart.subscribe((ev) => {
  if (ev.swingSource !== EntitySwingSource.Attack) return;
  ctrl().onSwing(ev.player, ev.heldItemStack);
});

world.afterEvents.playerButtonInput.subscribe((ev) => {
  if (ev.button === InputButton.Jump && ev.newButtonState === ButtonState.Pressed) ctrl().onJump(ev.player);
});

// ---------------------------------------------------------------- virtual HP: no vanilla damage for participants
world.beforeEvents.entityHurt.subscribe((ev) => {
  if (controller && controller.isProtected(ev.hurtEntity)) ev.cancel = true;
});

// ---------------------------------------------------------------- arena protection
world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  if (controller && controller.inMatch && controller.insideArena(ev.block.location)) ev.cancel = true;
});

world.afterEvents.entityDie.subscribe((ev) => {
  controller?.onEntityDie(ev.deadEntity);
});

world.afterEvents.playerLeave.subscribe((ev) => {
  controller?.onPlayerLeave(ev.playerId);
});

world.afterEvents.playerSpawn.subscribe((ev) => {
  ctrl().onPlayerSpawn(ev.player, ev.initialSpawn);
});

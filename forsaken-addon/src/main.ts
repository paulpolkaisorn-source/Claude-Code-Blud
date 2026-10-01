import { system, world } from "@minecraft/server";

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id === "forsaken:menu") {
    world.sendMessage("[Forsaken] hello world");
  }
});

// Player menus (ActionFormData / MessageFormData from @minecraft/server-ui).
import { Player, system } from "@minecraft/server";
import { ActionFormData, FormCancelationReason, MessageFormData, type ActionFormResponse, type MessageFormResponse } from "@minecraft/server-ui";
import { KILLERS, SURVIVORS } from "../characters/roster";
import type { CharacterDef } from "../characters/types";
import type { Difficulty } from "../core/config";
import { ARENAS } from "../world/layout";
import type { ResultRow, Winner } from "../core/game";
import { characterCard, controlsText, resultsBody } from "./text";

export interface MatchSettings {
  role: "killer" | "survivor";
  characterId: string;
  difficulty: Difficulty;
  arenaId: string;
}

/** Shows a form, retrying while the player is busy (chat open, another screen). */
async function show<T extends ActionFormResponse | MessageFormResponse>(player: Player, form: { show(p: Player): Promise<T> }): Promise<T | null> {
  for (let i = 0; i < 20; i++) {
    if (!player.isValid) return null;
    const r = await form.show(player);
    if (r.canceled && r.cancelationReason === FormCancelationReason.UserBusy) {
      await system.waitTicks(10);
      continue;
    }
    return r.canceled ? null : r;
  }
  return null;
}

export async function roleMenu(player: Player): Promise<MatchSettings | null> {
  const f = new ActionFormData()
    .title("§4FORSAKEN §7Bedrock Edition")
    .body("§7Unofficial fan project — not affiliated with or endorsed by the FORSAKEN developers or Roblox.\n\n§fOne killer vs eight survivors. Repair generators to shorten the clock, survive until it hits zero — or hunt everyone down.\n\n§eChoose your side:")
    .button("§cPlay as KILLER\n§8you vs 8 bot survivors")
    .button("§aPlay as SURVIVOR\n§8you + 7 bots vs 1 bot killer")
    .button("§eHow to play")
    .button("§7Close");
  const r = await show(player, f);
  if (!r || r.selection === undefined) return null;
  if (r.selection === 2) {
    await helpMenu(player);
    return roleMenu(player);
  }
  if (r.selection === 3) return null;
  const role = r.selection === 0 ? "killer" : "survivor";
  const characterId = await characterMenu(player, role);
  if (!characterId) return roleMenu(player);
  const difficulty = await difficultyMenu(player);
  if (!difficulty) return roleMenu(player);
  const arenaId = await arenaMenu(player);
  if (!arenaId) return roleMenu(player);
  return { role, characterId, difficulty, arenaId };
}

async function characterMenu(player: Player, role: "killer" | "survivor"): Promise<string | null> {
  const list: readonly CharacterDef[] = role === "killer" ? KILLERS : SURVIVORS;
  const f = new ActionFormData().title(role === "killer" ? "§cChoose your killer" : "§aChoose your survivor").body("§7Pick a character, or Random.");
  f.button("§l§eRandom\n§8surprise me");
  for (const c of list) {
    const roleLabel = c.team === "killer" ? "Killer" : `${cap(c.role)}${c.altRole ? "/" + cap(c.altRole) : ""}`;
    f.button(`${c.origin === "original" ? "§d" : "§f"}${c.name}\n§8${roleLabel} · ${c.playstyle}`);
  }
  f.button("§7Back");
  const r = await show(player, f);
  if (!r || r.selection === undefined || r.selection === list.length + 1) return null;
  if (r.selection === 0) return "random";
  const c = list[r.selection - 1];
  const confirm = new MessageFormData().title(`${c.name}`).body(characterCard(c)).button1("§aPick").button2("§7Back");
  const cr = await show(player, confirm);
  if (!cr || cr.selection !== 0) return characterMenu(player, role);
  return c.id;
}

async function difficultyMenu(player: Player): Promise<Difficulty | null> {
  const f = new ActionFormData()
    .title("Bot difficulty")
    .body("§7Bots react faster and play smarter on higher difficulties.")
    .button("§aEasy\n§8slow reactions, sloppy escapes")
    .button("§eNormal\n§8the intended experience")
    .button("§cHard\n§8fast reactions, no tunneling")
    .button("§7Back");
  const r = await show(player, f);
  if (!r || r.selection === undefined || r.selection === 3) return null;
  return (["easy", "normal", "hard"] as const)[r.selection];
}

async function arenaMenu(player: Player): Promise<string | null> {
  if (ARENAS.length === 1) return ARENAS[0].id;
  const f = new ActionFormData().title("Arena");
  for (const a of ARENAS) f.button(a.name);
  const r = await show(player, f);
  if (!r || r.selection === undefined) return null;
  return ARENAS[r.selection].id;
}

export async function helpMenu(player: Player): Promise<void> {
  const f = new MessageFormData().title("How to play").body(controlsText()).button1("OK").button2("Close");
  await show(player, f);
}

/** In-match menu (Forsaken Menu item during a match). Returns "leave" when the player aborts. */
export async function inMatchMenu(player: Player): Promise<"leave" | "help" | null> {
  const f = new ActionFormData().title("§4FORSAKEN").body("§7Match in progress.").button("§eControls & help").button("§cLeave match").button("§7Close");
  const r = await show(player, f);
  if (!r || r.selection === undefined) return null;
  if (r.selection === 0) {
    await helpMenu(player);
    return "help";
  }
  if (r.selection === 1) {
    const c = new MessageFormData().title("Leave match?").body("§7The match will end and everything is reset.").button1("§cLeave").button2("§7Stay");
    const cr = await show(player, c);
    return cr && cr.selection === 0 ? "leave" : null;
  }
  return null;
}

export async function resultsMenu(player: Player, winner: Winner, reason: string, rows: ResultRow[], humanId: string | null): Promise<"again" | null> {
  const f = new ActionFormData().title(winner === "killer" ? "§4KILLER WINS" : winner === "survivors" ? "§aSURVIVORS WIN" : "§7NOBODY WINS").body(resultsBody(winner, reason, rows, humanId)).button("§aPlay again").button("§7Close");
  const r = await show(player, f);
  return r && r.selection === 0 ? "again" : null;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

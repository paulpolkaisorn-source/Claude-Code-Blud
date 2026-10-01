// Saves and restores the human player's state around a match (inventory in a sealed vault of two
// barrels under the arena floor, scalars in a player dynamic property), and hands out hotbar items.
import { Container, Dimension, EntityComponentTypes, EquipmentSlot, GameMode, ItemLockMode, ItemStack, Player, world } from "@minecraft/server";
import type { CharacterDef } from "../characters/types";
import { abilityItemId } from "../characters/roster";
import type { Vec3 } from "../util/vec";

const SNAPSHOT_KEY = "forsaken:snapshot";
const ARMOR = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand];

export interface PlayerSnapshot {
  gameMode: string;
  dimension: string;
  location: Vec3;
  nameTag: string;
  difficulty: number;
  gamerules: Record<string, boolean | number>;
  time: number;
}

function barrel(dim: Dimension, p: Vec3): Container | undefined {
  const b = dim.getBlock(p);
  return b?.getComponent("minecraft:inventory")?.container;
}

/** Moves the player's items into the vault. Returns false if the vault is unavailable. */
export function stashInventory(player: Player, dim: Dimension, vault: Vec3[]): boolean {
  const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
  const a = barrel(dim, vault[0]);
  const b = barrel(dim, vault[1]);
  if (!inv || !a || !b) return false;
  a.clearAll();
  b.clearAll();
  for (let i = 0; i < inv.size && i < 36; i++) {
    if (!inv.getItem(i)) continue;
    if (i < 27) inv.moveItem(i, i, a);
    else inv.moveItem(i, i - 27, b);
  }
  const eq = player.getComponent(EntityComponentTypes.Equippable);
  ARMOR.forEach((slot, k) => {
    const it = eq?.getEquipment(slot);
    if (it) {
      b.setItem(9 + k, it);
      eq?.setEquipment(slot, undefined);
    }
  });
  inv.clearAll();
  return true;
}

/** Moves the vault contents back to the player. */
export function unstashInventory(player: Player, dim: Dimension, vault: Vec3[]): boolean {
  const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
  const a = barrel(dim, vault[0]);
  const b = barrel(dim, vault[1]);
  if (!inv || !a || !b) return false;
  inv.clearAll();
  for (let i = 0; i < 27; i++) if (a.getItem(i)) a.moveItem(i, i, inv);
  for (let i = 0; i < 9; i++) if (b.getItem(i)) b.moveItem(i, 27 + i, inv);
  const eq = player.getComponent(EntityComponentTypes.Equippable);
  ARMOR.forEach((slot, k) => {
    const it = b.getItem(9 + k);
    if (it) {
      eq?.setEquipment(slot, it);
      b.setItem(9 + k, undefined);
    }
  });
  a.clearAll();
  b.clearAll();
  return true;
}

/** World-level copy keyed by player name: survives servers that do not keep player data between sessions
 * (offline-mode players without an Xbox id get a fresh player record on every join). */
function worldSnapshotKey(player: Player): string {
  return `${SNAPSHOT_KEY}:${player.name}`;
}

export function saveSnapshot(player: Player, s: PlayerSnapshot): void {
  const json = JSON.stringify(s);
  player.setDynamicProperty(SNAPSHOT_KEY, json);
  world.setDynamicProperty(worldSnapshotKey(player), json);
}

export function loadSnapshot(player: Player): PlayerSnapshot | null {
  const own = player.getDynamicProperty(SNAPSHOT_KEY);
  const raw = typeof own === "string" ? own : world.getDynamicProperty(worldSnapshotKey(player));
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as PlayerSnapshot;
  } catch {
    return null;
  }
}

export function clearSnapshot(player: Player): void {
  player.setDynamicProperty(SNAPSHOT_KEY, undefined);
  world.setDynamicProperty(worldSnapshotKey(player), undefined);
}

export function gameModeFromString(s: string): GameMode {
  const all = Object.values(GameMode) as string[];
  return (all.includes(s) ? s : GameMode.Survival) as GameMode;
}

function lockedItem(id: string, slotLock = true): ItemStack {
  const it = new ItemStack(id, 1);
  it.lockMode = slotLock ? ItemLockMode.slot : ItemLockMode.inventory;
  it.keepOnDeath = true;
  return it;
}

/** Hotbar: slot 1 = killer basic attack, slots 2-5 = abilities, slot 9 = Forsaken Menu. */
export function giveHotbar(player: Player, c: CharacterDef): void {
  const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
  if (!inv) return;
  inv.clearAll();
  for (const a of c.abilities) inv.setItem(a.slot - 1, lockedItem(abilityItemId(c.id, a.id)));
  inv.setItem(8, lockedItem("forsaken:menu"));
  player.selectedSlotIndex = c.team === "killer" ? 0 : 1;
}

/** Slot 6: carried map item (Medkit / Bloxy Cola). */
export function setMapItemSlot(player: Player, item: "medkit" | "cola" | null): void {
  const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
  if (!inv) return;
  const want = item ? `forsaken:item_${item}` : undefined;
  const cur = inv.getItem(5)?.typeId;
  if (cur === want) return;
  inv.setItem(5, want ? lockedItem(want) : undefined);
}

export function giveMenuItem(player: Player): void {
  const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
  if (!inv) return;
  for (let i = 0; i < inv.size; i++) if (inv.getItem(i)?.typeId === "forsaken:menu") return;
  const left = inv.addItem(new ItemStack("forsaken:menu", 1));
  if (left) player.sendMessage("§c[Forsaken] Inventory full — free a slot and run /scriptevent forsaken:give_menu");
}

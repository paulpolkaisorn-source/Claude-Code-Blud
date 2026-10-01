// Headless Bedrock client for smoke tests against a local BDS (started by tools/bds.mjs --client).
// It joins as an offline player, logs what the addon sends to a player (forms, titles/actionbar,
// movement/hunger/health attributes, chat) and answers forms from a scripted list.
//
// Not a dependency of the project. Install the client library somewhere and point to it:
//   npm install --prefix <dir> bedrock-protocol --ignore-scripts
//   BEDROCK_CLIENT_DIR=<dir> BDS_DIR=... node tools/bds.mjs --client tools/smoke-client.mjs ...
// Environment:
//   BEDROCK_CLIENT_DIR   folder whose node_modules has bedrock-protocol (default: this project)
//   SMOKE_NAME           player name (default "Smoke")
//   SMOKE_VERSION        protocol version string known to bedrock-protocol (default "1.26.51")
//   SMOKE_FORMS          comma-separated answers for forms in order: a button index, "true"/"false"
//                        for two-button message forms, a JSON array for modal forms, or "close"
//                        (default: close every form)
//   SMOKE_SECONDS        total time before leaving for good (default 600)
//   SMOKE_REJOIN_AFTER   leave after this many seconds and join again 5 s later (optional)
//   SMOKE_SPRINT         "<from>-<to>" seconds after the first spawn: hold forward + sprint (optional)
//   SMOKE_JUMP           seconds after the first spawn at which to press jump, comma-separated (optional)
//   SMOKE_USE            hotbar actions after the first spawn, "<seconds>:<slot>:<use|swing>[:<item id>]",
//                        comma-separated (slot 1-9; use = right-click, swing = left-click in the air). The
//                        item id (e.g. forsaken:ab_slasher_raging_pace) is used when the client could not
//                        decode the slot contents.
import { createRequire } from "node:module";
import path from "node:path";

const base = process.env.BEDROCK_CLIENT_DIR ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const require = createRequire(path.join(base, "package.json"));
const bedrock = require("bedrock-protocol");
// BDS listens with NetherNet (WebRTC) by default. The library's ping() also loads the native RakNet
// module, so the LAN advertisement (with the server's network id) is fetched directly.
const { NethernetClient } = require("bedrock-protocol/src/nethernet");

const name = process.env.SMOKE_NAME ?? "Smoke";
const host = process.env.SMOKE_HOST ?? "127.0.0.1";
const version = process.env.SMOKE_VERSION ?? "1.26.51";
const answers = (process.env.SMOKE_FORMS ?? "").split(",").filter(Boolean);
const total = Number(process.env.SMOKE_SECONDS ?? 600) * 1000;
const rejoinAfter = process.env.SMOKE_REJOIN_AFTER ? Number(process.env.SMOKE_REJOIN_AFTER) * 1000 : null;
const uses = (process.env.SMOKE_USE ?? "")
  .split(",")
  .filter(Boolean)
  .map((u) => {
    const [sec, slot, kind, ...item] = u.split(":");
    return { at: Number(sec) * 1000, slot: Number(slot) - 1, swing: kind === "swing", item: item.length ? item.join(":") : null };
  });
const out = (msg) => console.log(msg.replace(/§./g, "").replace(/\n/g, " ⏎ "));

async function join(session) {
  const ad = await new NethernetClient({ host }).ping(15000);
  out(`[session ${session}] found server: ${ad.motd ?? ad.serverName ?? "?"} (${ad.gameVersion ?? "?"}), network id ${ad.networkId}`);
  const client = bedrock.createClient({
    host,
    username: name,
    offline: true,
    version,
    transport: "nethernet",
    nethernet: { networkId: ad.networkId, signalling: "lan", webrtcBackend: "werift" },
    skipPing: true,
    connectTimeout: 30000,
  });
  // Remember which packet ids fail to decode (logged with the error below).
  let lastFailedId = null;
  const des = client.deserializer;
  if (des?.parsePacketBuffer) {
    const parse = des.parsePacketBuffer.bind(des);
    des.parsePacketBuffer = (buf) => {
      try {
        return parse(buf);
      } catch (e) {
        lastFailedId = buf[0];
        throw e;
      }
    };
  }
  if (process.env.SMOKE_TRACE) {
    const seen = new Map();
    client.on("packet", (d) => seen.set(d.data.name, (seen.get(d.data.name) ?? 0) + 1));
    setInterval(() => out(`packets: ${[...seen].map(([k, v]) => `${k}=${v}`).join(" ")}`), 15000).unref();
  }
  let titles = 0;
  let selfId = null;
  let selfRuntime = null;
  let pos = { x: 0, y: 0, z: 0 };
  const hotbar = [];
  const itemIds = new Map();
  const lastAttr = new Map();
  client.on("item_registry", (p) => {
    for (const e of p.itemstates ?? []) itemIds.set(e.name, e.runtime_id);
  });

  let tick = 0n;
  let pending = null; // { flags, transaction } sent with the next input packet
  client.on("start_game", (p) => {
    selfId = String(p.runtime_entity_id);
    selfRuntime = p.runtime_entity_id;
    pos = p.player_position ?? pos;
    tick = BigInt(p.current_tick ?? 0);
  });
  // Server-authoritative input: a real client sends player_auth_input every tick. Item use rides on it.
  const zero2 = { x: 0, z: 0 };
  const inputTimer = setInterval(() => {
    if (!selfRuntime) return;
    tick += 1n;
    const extra = pending;
    pending = null;
    // Running forward (+z at yaw 0) at sprint speed: the server accepts or corrects each step.
    const run = client.running;
    if (run) pos = { x: pos.x, y: pos.y, z: pos.z + 0.28 };
    const moveFlags = run ? ["up", "sprinting", "sprint_down", ...(client.running === "start" ? ["start_sprinting"] : [])] : [];
    if (client.running === "start") client.running = true;
    try {
      client.queue("player_auth_input", {
        pitch: 0,
        yaw: 0,
        position: pos,
        move_vector: run ? { x: 0, z: 1 } : zero2,
        head_yaw: 0,
        input_data: [...moveFlags, ...(extra?.flags ?? [])],
        input_mode: "mouse",
        play_mode: "normal",
        interaction_model: "crosshair",
        interact_rotation: zero2,
        tick,
        delta: run ? { x: 0, y: 0, z: 0.28 } : { x: 0, y: 0, z: 0 },
        transaction: extra?.transaction,
        item_stack_request: undefined,
        block_action: undefined,
        vehicle_rotation: undefined,
        predicted_vehicle: undefined,
        analogue_move_vector: zero2,
        camera_orientation: { x: 0, y: 0, z: 1 },
        raw_move_vector: run ? { x: 0, z: 1 } : zero2,
      });
    } catch (e) {
      out(`auth input not sent: ${e.message}`);
      clearInterval(inputTimer);
    }
  }, 50);
  client.on("close", () => clearInterval(inputTimer));
  client.corrections = () => corrections;
  client.on("move_player", (p) => {
    if (String(p.runtime_id) === selfId) pos = p.position;
  });
  // The server corrects our predicted position (walls, speed limits); follow it like a real client.
  let corrections = 0;
  client.on("correct_player_move_prediction", (p) => {
    pos = p.position;
    corrections++;
  });
  client.running = false;
  // Hotbar contents (the addon fills slots 1-5 with ability items, 9 with the menu).
  client.on("inventory_content", (p) => {
    if (process.env.SMOKE_TRACE) out(`inventory_content window=${p.window_id} n=${p.input?.length} first=${JSON.stringify(p.input?.[0] ?? null, (k, v) => (typeof v === "bigint" ? String(v) : v)).slice(0, 200)}`);
    if (p.window_id !== "inventory") return;
    p.input.slice(0, 9).forEach((it, i) => (hotbar[i] = it));
  });
  // This server sends player inventory changes as inventory_transaction actions (old/new item per slot).
  client.on("inventory_transaction", (p) => {
    const t = p.transaction;
    for (const a of t?.actions ?? []) {
      if (process.env.SMOKE_TRACE) out(`inventory_transaction source=${a.source_type} window=${a.window_id} slot=${a.slot} new=${a.new_item?.network_id}`);
      if (a.source_type === "container" && (a.window_id === "inventory" || a.window_id === 0) && a.slot < 9) hotbar[a.slot] = a.new_item;
    }
  });
  client.on("add_item_entity", (p) => {
    const name = [...itemIds].find(([, id]) => id === p.item?.network_id)?.[0] ?? p.item?.network_id;
    out(`item entity appeared: ${name} x${p.item?.count} at ${Math.round(p.position?.x)},${Math.round(p.position?.y)},${Math.round(p.position?.z)}`);
  });
  client.on("inventory_slot", (p) => {
    if (process.env.SMOKE_TRACE) out(`inventory_slot window=${p.window_id} slot=${p.slot} id=${p.item?.network_id}`);
    if (p.window_id === "inventory" && p.slot < 9) hotbar[p.slot] = p.item;
  });
  // Jump: one input packet with the jump-pressed flags, then released on the next one.
  client.jump = () => {
    pending = { flags: ["jump_down", "jumping", "start_jumping", "jump_pressed_raw", "jump_current_raw"] };
    out("pressed jump");
  };
  client.press = (slot, swing, itemName) => {
    let item = hotbar[slot];
    if ((!item || item.network_id === 0) && itemName && itemIds.has(itemName)) {
      // Build the stack from the item registry: count 1 with the lock / keep-on-death tags the addon sets.
      const nbt = { type: "compound", name: "", value: { "minecraft:item_lock": { type: "byte", value: 1 }, "minecraft:keep_on_death": { type: "byte", value: 1 } } };
      item = { network_id: itemIds.get(itemName), count: 1, metadata: 0, has_stack_id: false, block_runtime_id: 0, extra: { has_nbt: "true", nbt: { version: 1, nbt }, can_place_on: [], can_destroy: [] } };
    }
    if (!item || item.network_id === 0) {
      out(`press slot ${slot + 1}: empty${itemName ? ` (${itemName} not in the item registry: ${itemIds.size} items known)` : ""}`);
      return;
    }
    client.queue("mob_equipment", { runtime_entity_id: selfRuntime, item, slot, selected_slot: slot, window_id: "inventory" });
    if (swing) {
      client.queue("animate", { action_id: "swing_arm", runtime_entity_id: selfRuntime, data: 0, has_swing_source: true, swing_source: "attack" });
    } else {
      const data = {
        action_type: "click_air",
        trigger_type: "player_input",
        block_position: { x: 0, y: 0, z: 0 },
        face: 255,
        hotbar_slot: slot,
        hand: "main_hand",
        held_item: item,
        player_pos: pos,
        click_pos: { x: 0, y: 0, z: 0 },
        block_runtime_id: 0,
        client_prediction: "success",
        client_cooldown_state: "off",
      };
      // Newer servers read item use from player_auth_input; older ones from inventory_transaction.
      pending = { flags: ["item_interact", "start_using_item"], transaction: { legacy: { legacy_request_id: 0 }, actions: [], data } };
      client.queue("inventory_transaction", { transaction: { legacy: { legacy_request_id: 0 }, transaction_type: "item_use", actions: [], transaction_data: data } });
    }
    out(`pressed slot ${slot + 1} (${swing ? "swing" : "use"}), item network id ${item.network_id}`);
  };
  client.on("spawn", () => out(`[session ${session}] spawned as ${name}`));
  client.on("disconnect", (p) => out(`disconnected: ${JSON.stringify(p)}`));
  client.on("kick", (p) => out(`kicked: ${JSON.stringify(p)}`));
  client.on("error", (e) => {
    const msg = String(e?.message ?? e);
    // The library's packet definitions are for 1.26.51; a few 1.26.52 packets do not decode. Those
    // packets are skipped by the library and are not ones this test reads.
    if (msg.startsWith("Read error")) out(`(skipped a packet the ${version} definitions cannot decode: id ${lastFailedId})`);
    else out(`client error: ${msg}`);
  });
  client.on("set_player_game_type", (p) => out(`game mode -> ${p.gamemode}`));
  client.on("text", (p) => {
    if (p.message) out(`chat: ${p.message}`);
  });
  // Titles, subtitles and actionbar (HUD). The actionbar is resent every few ticks: log a sample.
  client.on("set_title", (p) => {
    titles++;
    if (p.type !== "action_bar_message" || titles % 40 === 1) out(`title[${p.type}]: ${p.text}`);
  });
  // Speed (movement), hunger (stamina / sprint lock) and health (hearts) written by the addon.
  client.on("update_attributes", (p) => {
    if (String(p.runtime_entity_id) !== selfId) return; // bots and props send attributes too
    for (const a of p.attributes ?? []) {
      if (!["minecraft:movement", "minecraft:player.hunger", "minecraft:health"].includes(a.name)) continue;
      const v = Math.round(a.current * 10000) / 10000;
      if (lastAttr.get(a.name) === v) continue;
      lastAttr.set(a.name, v);
      out(`attr ${a.name}=${v}`);
    }
  });
  client.on("modal_form_request", (p) => {
    let form;
    try {
      form = JSON.parse(p.data);
    } catch {
      form = { title: "?" };
    }
    const buttons = (form.buttons ?? []).map((b, i) => `${i}:${b.text}`).join(" | ");
    out(`form #${p.form_id} [${form.type}] ${form.title} :: ${buttons || "(no buttons)"}`);
    const ans = answers.shift() ?? "close";
    setTimeout(() => {
      if (ans === "close") {
        client.queue("modal_form_response", { form_id: p.form_id, has_response_data: false, has_cancel_reason: true, cancel_reason: "closed" });
        out(`form #${p.form_id} closed`);
      } else {
        client.queue("modal_form_response", { form_id: p.form_id, has_response_data: true, data: ans, has_cancel_reason: false });
        out(`form #${p.form_id} answered ${ans}`);
      }
    }, 1500);
  });
  return client;
}

const started = Date.now();
let client = await join(1);
for (const u of uses) setTimeout(() => client.press(u.slot, u.swing, u.item), u.at);
for (const t of (process.env.SMOKE_JUMP ?? "").split(",").filter(Boolean)) setTimeout(() => client.jump(), Number(t) * 1000);
if (process.env.SMOKE_SPRINT) {
  const [from, to] = process.env.SMOKE_SPRINT.split("-").map(Number);
  setTimeout(() => {
    client.running = "start";
    out("sprinting forward");
  }, from * 1000);
  setTimeout(() => {
    client.running = false;
    out(`stopped sprinting (${client.corrections()} position corrections from the server)`);
  }, to * 1000);
}
if (rejoinAfter !== null) {
  setTimeout(() => {
    out("leaving to test rejoin");
    client.disconnect();
    setTimeout(async () => {
      client = await join(2);
    }, 5000);
  }, rejoinAfter);
}
setTimeout(() => {
  out(`time is up after ${Math.round((Date.now() - started) / 1000)} s, leaving`);
  client.disconnect();
  setTimeout(() => process.exit(0), 500);
}, total);

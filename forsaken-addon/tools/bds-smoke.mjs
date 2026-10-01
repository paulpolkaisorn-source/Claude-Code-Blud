// Runs the Bedrock Dedicated Server smoke scenarios one after another and checks the server log.
// Usage:
//   BDS_DIR=<bedrock-server> BEDROCK_CLIENT_DIR=<dir with bedrock-protocol> node tools/bds-smoke.mjs [scenario...]
// Without BEDROCK_CLIENT_DIR only the bots-only scenario runs (no player needed).
// Run `npm run build` first: the packs in packs/ are what gets loaded.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/fsutil.mjs";

const LOG = path.join(ROOT, ".cache", "bds-last.log");
const join = (...cmds) => cmds.flatMap((c) => ["--cmd", c]);
const asSmoke = (cmd) => `execute as @a[name=Smoke] run ${cmd}`;

/** Each scenario: bds.mjs arguments, client environment, and log patterns that must (or must not) appear. */
const SCENARIOS = {
  bots: {
    about: "bots-only match (Slasher) runs to a result in the real server",
    args: [...join("scriptevent forsaken:selftest slasher normal"), "--until", "SELFTEST DONE|quickstart failed|tick error", "--wait", "600"],
    expect: [/SELFTEST DONE winner=(killer|survivors|nobody)/],
    report: [/SELFTEST DONE.*/],
  },
  backtoback: {
    about: "two bots-only matches back to back in one server session (arena reused, everything cleaned up in between)",
    args: [
      ...join("scriptevent forsaken:selftest noli normal", "after:cleanup done|scriptevent forsaken:selftest guest_666 normal"),
      "--until",
      "SELFTEST DONE[\\s\\S]*cleanup done[\\s\\S]*SELFTEST DONE[\\s\\S]*cleanup done",
      "--wait",
      "1500",
    ],
    expect: [/SELFTEST start: killer=noli/, /SELFTEST start: killer=guest_666/, /SELFTEST DONE[\s\S]*SELFTEST DONE/, /cleanup done[\s\S]*cleanup done/],
    report: [/SELFTEST DONE.*/g],
  },
  killer: {
    about: "human killer: quickstart, head-start freeze, timer win for survivors, results form, creative mode and items restored",
    client: { SMOKE_SECONDS: "400" },
    args: [
      ...join(
        "after:Player Spawned: Smoke|give Smoke diamond 5",
        "after:Player Spawned: Smoke|gamemode creative Smoke",
        `after:Player Spawned: Smoke|${asSmoke("scriptevent forsaken:quickstart killer slasher normal")}`,
        "after:restored Smoke|clear Smoke diamond 0 0",
      ),
      "--until",
      "Smoke has [0-9]+ items|No items|time is up",
      "--wait",
      "460",
    ],
    expect: [/match start: you=killer:slasher/, /attr minecraft:movement=0$/m, /title\[set_title\]: HUNT/, /round over: survivors/, /form #\d+ \[form\] SURVIVORS WIN/, /restored Smoke: game mode Creative, position, inventory/, /Smoke has 5 items/],
  },
  survivor: {
    about: "human survivor through the real menus (role, character, Pick, difficulty): HUD, damage as hearts, elimination to spectator, results, restore",
    client: { SMOKE_FORMS: "1,1,true,1", SMOKE_SECONDS: "600" },
    args: [
      ...join("after:Player Spawned: Smoke|give Smoke diamond 3", `after:Player Spawned: Smoke|${asSmoke("scriptevent forsaken:menu")}`, "after:restored Smoke|clear Smoke diamond 0 0"),
      "--until",
      "Smoke has [0-9]+ items|No items|time is up",
      "--wait",
      "660",
    ],
    expect: [/form #1 \[form\] FORSAKEN Bedrock Edition/, /form #3 \[modal\] Noob/, /match start: you=survivor:noob/, /action_bar_message\]: .*HP \d+\/100/, /round over:/, /restored Smoke: game mode Survival, position, inventory/, /Smoke has 3 items/],
    report: [/attr minecraft:health=\d+/g, /round over: .*/],
  },
  rejoin: {
    about: "host disconnects mid-match: match cleaned up; on rejoin the snapshot (creative + items) is restored",
    client: { SMOKE_REJOIN_AFTER: "40", SMOKE_SECONDS: "110" },
    args: [
      ...join(
        "after:Player Spawned: Smoke|give Smoke diamond 4",
        "after:Player Spawned: Smoke|gamemode creative Smoke",
        `after:Player Spawned: Smoke|${asSmoke("scriptevent forsaken:quickstart survivor taph hard")}`,
        "after:restored Smoke|clear Smoke diamond 0 0",
      ),
      "--until",
      "Smoke has [0-9]+ items|No items|time is up",
      "--wait",
      "200",
    ],
    expect: [/cleanup done \(host left\)/, /Restoring your inventory from an interrupted match/, /restored Smoke: game mode Creative, position, inventory/, /Smoke has 4 items/],
  },
  leave: {
    about: "in-match menu → Leave match → confirm: match stops and the player is restored",
    client: { SMOKE_FORMS: "1,true", SMOKE_SECONDS: "90" },
    args: [
      ...join(
        "after:Player Spawned: Smoke|give Smoke iron_ingot 7",
        `after:Player Spawned: Smoke|${asSmoke("scriptevent forsaken:quickstart killer noli easy")}`,
        `after:set_title\\]: HUNT|${asSmoke("scriptevent forsaken:menu")}`,
        "after:restored Smoke|clear Smoke iron_ingot 0 0",
      ),
      "--until",
      "Smoke has [0-9]+ items|No items|time is up",
      "--wait",
      "200",
    ],
    expect: [/form #\d+ \[modal\] Leave match\?/, /cleanup done \(You left the match\.\)/, /Smoke has 7 items/],
  },
  swing: {
    about: "left-click swing with the slot-1 weapon fires the killer basic attack (playerSwingStart)",
    client: { SMOKE_USE: "30:1:swing", SMOKE_SECONDS: "36" },
    args: [...join("after:Player Spawned: Smoke|scriptevent forsaken:debug", `after:Player Spawned: Smoke|${asSmoke("scriptevent forsaken:quickstart killer slasher normal")}`), "--until", "time is up", "--wait", "150"],
    expect: [/input: swing slash -> ok/],
  },
  jump: {
    about: "jump presses reach the match (playerButtonInput): used for tug-of-war, pop-ups and bat-form flaps",
    client: { SMOKE_JUMP: "30,31,32", SMOKE_SECONDS: "36" },
    args: [...join("after:Player Spawned: Smoke|scriptevent forsaken:debug", `after:Player Spawned: Smoke|${asSmoke("scriptevent forsaken:quickstart survivor noob normal")}`), "--until", "time is up", "--wait", "150"],
    expect: [/input: jump \(1\)/, /input: jump \(3\)/, /\[debug\] tick \d+ms avg/],
  },
};

const wanted = process.argv.slice(2);
const hasClient = !!process.env.BEDROCK_CLIENT_DIR;
const names = (wanted.length ? wanted : Object.keys(SCENARIOS)).filter((n) => {
  if (!SCENARIOS[n]) throw new Error(`unknown scenario ${n}`);
  if (SCENARIOS[n].client && !hasClient) {
    console.log(`[smoke] skip ${n}: set BEDROCK_CLIENT_DIR to run scenarios with a player`);
    return false;
  }
  return true;
});

const results = [];
for (const name of names) {
  const sc = SCENARIOS[name];
  console.log(`[smoke] ${name}: ${sc.about}`);
  const args = ["tools/bds.mjs", "--quiet", ...(sc.client ? ["--client", "tools/smoke-client.mjs"] : []), ...sc.args];
  const t0 = Date.now();
  const run = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...(sc.client ?? {}) }, encoding: "utf8" });
  const log = fs.existsSync(LOG) ? fs.readFileSync(LOG, "utf8") : "";
  if (log) fs.writeFileSync(path.join(ROOT, ".cache", `bds-smoke-${name}.log`), log);
  const missing = sc.expect.filter((re) => !re.test(log)).map((re) => re.source);
  const bdsProblems = run.status !== 0 ? (run.stdout + run.stderr).split("\n").filter((l) => /problem|never reported|timed out/.test(l)) : [];
  const ok = missing.length === 0 && bdsProblems.length === 0;
  const notes = (sc.report ?? []).flatMap((re) => (re.global ? [...log.matchAll(re)].map((m) => m[0]) : [log.match(re)?.[0] ?? ""])).filter(Boolean);
  results.push({ name, ok, seconds: Math.round((Date.now() - t0) / 1000), missing, bdsProblems, notes });
  console.log(`[smoke] ${name}: ${ok ? "PASS" : "FAIL"} (${Math.round((Date.now() - t0) / 1000)} s)`);
  for (const m of missing) console.log(`         missing: /${m}/`);
  for (const p of bdsProblems) console.log(`         ${p.trim()}`);
  if (notes.length) console.log(`         ${[...new Set(notes)].slice(0, 12).join(" | ")}`);
}
console.log(`\n[smoke] ${results.filter((r) => r.ok).length}/${results.length} passed. Logs: .cache/bds-smoke-<scenario>.log`);
process.exit(results.every((r) => r.ok) ? 0 : 1);

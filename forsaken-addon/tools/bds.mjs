// Runs packs inside a local Bedrock Dedicated Server (BDS) for smoke tests.
// Usage:
//   BDS_DIR=/path/to/bedrock-server node tools/bds.mjs [--bp dir] [--rp dir] [--cmd "scriptevent forsaken:selftest"]...
//                                                       [--wait 120] [--until "regex"] [--fresh]
// Defaults: the packs in packs/, a fresh world, 60 s timeout. The full log is written to .cache/bds-last.log.
// Exit code 1 when the log contains script errors, content-log errors or pack-loading failures.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, BP, RP, readJson } from "./lib/fsutil.mjs";

const args = process.argv.slice(2);
const opt = { bp: BP, rp: RP, cmds: [], wait: 60, until: null, fresh: true, level: "forsaken_smoke" };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--bp") opt.bp = path.resolve(args[++i]);
  else if (a === "--rp") opt.rp = path.resolve(args[++i]);
  else if (a === "--cmd") opt.cmds.push(args[++i]);
  else if (a === "--wait") opt.wait = Number(args[++i]);
  else if (a === "--until") opt.until = new RegExp(args[++i]);
  else if (a === "--keep-world") opt.fresh = false;
  else if (a === "--level") opt.level = args[++i];
  else throw new Error(`unknown argument ${a}`);
}
const bds = process.env.BDS_DIR;
if (!bds || !fs.existsSync(path.join(bds, "bedrock_server"))) {
  console.error("[bds] set BDS_DIR to an unpacked Bedrock Dedicated Server (Linux) folder");
  process.exit(2);
}

// --- server.properties
const propsFile = path.join(bds, "server.properties");
let props = fs.readFileSync(propsFile, "utf8");
const setProp = (k, v) => {
  const re = new RegExp(`^${k}=.*$`, "m");
  props = re.test(props) ? props.replace(re, `${k}=${v}`) : props + `\n${k}=${v}\n`;
};
setProp("level-name", opt.level);
setProp("content-log-console-output-enabled", "true");
setProp("content-log-file-enabled", "false");
setProp("content-log-level", "info");
setProp("allow-cheats", "true");
setProp("online-mode", "false");
setProp("allow-list", "false");
setProp("default-player-permission-level", "operator");
fs.writeFileSync(propsFile, props);

// --- packs
const worldDir = path.join(bds, "worlds", opt.level);
if (opt.fresh) fs.rmSync(worldDir, { recursive: true, force: true });
fs.mkdirSync(worldDir, { recursive: true });
const packRefs = (dir) => {
  const m = readJson(path.join(dir, "manifest.json"));
  return [{ pack_id: m.header.uuid, version: m.header.version }];
};
const installPack = (src, sub) => {
  const dest = path.join(bds, sub, path.basename(src));
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
};
installPack(opt.bp, "behavior_packs");
fs.writeFileSync(path.join(worldDir, "world_behavior_packs.json"), JSON.stringify(packRefs(opt.bp), null, 2));
if (opt.rp && fs.existsSync(path.join(opt.rp, "manifest.json"))) {
  installPack(opt.rp, "resource_packs");
  fs.writeFileSync(path.join(worldDir, "world_resource_packs.json"), JSON.stringify(packRefs(opt.rp), null, 2));
}

// --- run
const logFile = path.join(ROOT, ".cache", "bds-last.log");
fs.mkdirSync(path.dirname(logFile), { recursive: true });
const log = fs.createWriteStream(logFile);
const child = spawn("./bedrock_server", [], { cwd: bds, env: { ...process.env, LD_LIBRARY_PATH: "." } });
let out = "";
let started = false;
let finished = false;
const onData = (buf) => {
  const s = buf.toString();
  out += s;
  log.write(s);
  process.stdout.write(s);
  if (!started && /Server started\./.test(out)) {
    started = true;
    let delay = 3000;
    for (const c of opt.cmds) {
      setTimeout(() => child.stdin.write(c + "\n"), delay);
      delay += 1500;
    }
  }
  if (started && opt.until && opt.until.test(out) && !finished) {
    finished = true;
    setTimeout(stop, 1500);
  }
};
child.stdout.on("data", onData);
child.stderr.on("data", onData);
function stop() {
  try {
    child.stdin.write("stop\n");
  } catch {
    /* already gone */
  }
  setTimeout(() => child.kill("SIGKILL"), 15000).unref();
}
const timer = setTimeout(stop, opt.wait * 1000);
child.on("exit", () => {
  clearTimeout(timer);
  log.end();
  const problems = out
    .split(/\r?\n/)
    .filter((l) => /\[Scripting\].*(Error|error|Exception)|\bERROR\b|\[(Json|Molang|Entity|Item|Blocks|Texture|Geometry|Animation|Render|Pack)[^\]]*\]\s*\[error\]|Unhandled promise|failed to load|Pack .* not found|Unable to load/i.test(l))
    .filter((l) => !/\[forsaken\] (INFO|OK)/.test(l));
  console.log(`\n[bds] log: ${path.relative(ROOT, logFile)}`);
  if (!started) {
    console.error("[bds] server never reported 'Server started.'");
    process.exit(1);
  }
  if (opt.until && !finished) {
    console.error(`[bds] timed out before /${opt.until.source}/ appeared`);
    process.exit(1);
  }
  if (problems.length) {
    console.error(`[bds] ${problems.length} problem line(s):`);
    for (const p of problems.slice(0, 50)) console.error("  " + p);
    process.exit(1);
  }
  console.log("[bds] no errors in log");
});

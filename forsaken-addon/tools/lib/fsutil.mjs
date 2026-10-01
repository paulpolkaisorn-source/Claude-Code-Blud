import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const BP = path.join(ROOT, "packs", "Forsaken_BP");
export const RP = path.join(ROOT, "packs", "Forsaken_RP");

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Writes JSON with 2-space indentation; only touches the file when content changes. */
export function writeJson(file, obj) {
  writeText(file, JSON.stringify(obj, null, 2) + "\n");
}

export function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === text) return false;
  fs.writeFileSync(file, text);
  return true;
}

export function writeBuffer(file, buf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && Buffer.compare(fs.readFileSync(file), buf) === 0) return false;
  fs.writeFileSync(file, buf);
  return true;
}

export function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out.sort();
}

export function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

/** Removes files in `dir` (recursively) whose relative path is not in `keep` and matches `filter`. */
export function pruneDir(dir, keep, filter = () => true) {
  for (const f of walk(dir)) {
    const r = path.relative(dir, f).split(path.sep).join("/");
    if (filter(r) && !keep.has(r)) fs.rmSync(f);
  }
}

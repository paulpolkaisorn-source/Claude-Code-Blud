const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function roman(n: number): string {
  const i = Math.round(n);
  return i >= 0 && i < ROMAN.length ? ROMAN[i] : String(i);
}

/** 125.4 -> "2:05" */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

/** 12.345 -> "12.3s", 0 -> "READY" */
export function cooldownText(seconds: number): string {
  if (seconds <= 0.05) return "READY";
  return `${seconds.toFixed(1)}s`;
}

const ARROWS = ["▲", "◥", "▶", "◢", "▼", "◣", "◀", "◤"];

/** Arrow for a relative horizontal angle in degrees (0 = straight ahead, positive = to the right). */
export function arrowFor(relDeg: number): string {
  let a = relDeg % 360;
  if (a < 0) a += 360;
  return ARROWS[Math.round(a / 45) % 8];
}

export function bar(fraction: number, width = 10, full = "|", empty = "."): string {
  const f = Math.max(0, Math.min(1, fraction));
  const n = Math.round(f * width);
  return full.repeat(n) + empty.repeat(width - n);
}

export function pct(fraction: number): string {
  return `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
}

// Minecraft's script runtime provides a console (output goes to the content log / server console).
declare const console: {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

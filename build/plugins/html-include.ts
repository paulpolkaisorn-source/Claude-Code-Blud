import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

// Expands <!-- @include path/relative/to/root.html --> in the entry HTML document.
// Include paths are relative to the Vite root. Partials may include partials up to
// MAX_DEPTH levels deep; the entry document's own includes are level 1.
const MAX_DEPTH = 3;

export function htmlInclude(): Plugin {
  let root = '';
  let serving = false;
  let devServer: ViteDevServer | undefined;
  const partials = new Set<string>();

  const nameOf = (abs: string): string => relative(root, abs).split(sep).join('/');

  const include = (html: string, owner: string, depth: number, chain: readonly string[]): string =>
    html.replace(/<!--\s*@include\s+(\S+?)\s*-->/g, (_directive, rel: string) => {
      const abs = resolve(root, rel);
      const trail = [...chain, abs].map(nameOf).join(' -> ');
      if (chain.includes(abs)) {
        throw new Error(`html-include: include cycle: ${trail}`);
      }
      if (depth > MAX_DEPTH) {
        throw new Error(`html-include: nesting deeper than ${MAX_DEPTH} levels: ${trail}`);
      }
      if (!existsSync(abs)) {
        const message = `html-include: missing file "${rel}" (included from "${owner}")`;
        if (!serving) throw new Error(message);
        console.warn(message);
        return `<!-- missing include: ${rel} -->`;
      }
      if (!partials.has(abs)) {
        partials.add(abs);
        devServer?.watcher.add(abs);
      }
      return include(readFileSync(abs, 'utf8'), nameOf(abs), depth + 1, [...chain, abs]);
    });

  return {
    name: 'html-include',
    configResolved(config) {
      root = config.root;
      serving = config.command === 'serve';
    },
    configureServer(server) {
      devServer = server;
      server.watcher.on('change', (file) => {
        if (partials.has(resolve(file))) {
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const entry = resolve(ctx.filename);
        return include(html, nameOf(entry), 1, [entry]);
      },
    },
  };
}

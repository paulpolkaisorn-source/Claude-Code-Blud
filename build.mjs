// Builds index.html (a normal web page you can open in any browser)
// from src/app.html (the page source that is also published as the Claude artifact).
// Run: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('./src/app.html', import.meta.url), 'utf8');

const titleMatch = src.match(/<title>[\s\S]*?<\/title>/);
const title = titleMatch ? titleMatch[0] : '<title>Forearm Forge</title>';
const body = src
  .replace(/<title>[\s\S]*?<\/title>\s*/, '')
  .replace(/<meta name="claude:viewport-fit-sides"[^>]*>\s*/, '');

const out = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0c1320">
${title}
</head>
<body>
${body}
</body>
</html>
`;

writeFileSync(new URL('./index.html', import.meta.url), out);
console.log(`index.html written (${out.length.toLocaleString()} bytes)`);

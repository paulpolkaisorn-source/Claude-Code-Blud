// Serve the viewer locally: node tools/serve.mjs [port]
import http from 'node:http';
import { startServer } from './lib.mjs';

const port = Number(process.argv[2] || 8080);
const { server, url } = await startServer();
// re-expose the ephemeral server on a fixed port
http.createServer((req, res) => {
  const p = http.request(url + req.url, { method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  req.pipe(p);
}).listen(port, () => console.log(`InHuman 18 viewer: http://localhost:${port}/`));
process.on('SIGINT', () => { server.close(); process.exit(0); });

// Static server for the PRODUCTION build, mounted at the real GitHub Pages path.
// Stack independent: serves build/ (CRA or Vite with outDir 'build'), falls back to dist/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const BASE = '/movie-database/';
const PORT = Number(process.env.E2E_PORT || 4173);
const ROOT = path.resolve(process.cwd(), ['build', 'dist'].find((d) => fs.existsSync(path.join(process.cwd(), d, 'index.html'))) || 'build');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.map': 'application/json', '.woff2': 'font/woff2' };

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (!url.pathname.startsWith(BASE)) {
    res.writeHead(404).end('Not found (app is mounted at ' + BASE + ')');
    return;
  }
  if (url.pathname === BASE + 'e2e-stale-sw.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' }).end('// test-only stale service worker (BC-18)');
    return;
  }
  let rel =decodeURIComponent(url.pathname.slice(BASE.length)) || 'index.html';
  let file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) return res.writeHead(404).end('Not found');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`serving ${ROOT} at http://localhost:${PORT}${BASE}`));

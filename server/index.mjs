#!/usr/bin/env node
// Production server: serves the built front-end and state.json, runs the
// collector scheduler in-process, and pushes "state changed" over SSE so open
// pages refresh within seconds instead of waiting for their next poll.
import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream, watchFile } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { ROOT } from './lib/store.mjs';
import { runCollectors } from './lib/pipeline.mjs';
import { buildState, writeState } from './lib/state.mjs';

const PORT = Number(process.env.PORT || 8080);
const DIST = path.join(ROOT, 'dist');
const STATE = path.join(ROOT, 'public/data/state.json');
const TICK_MS = Number(process.env.TICK_SECONDS || 60) * 1000;
const COLLECT = process.env.DISABLE_COLLECTOR !== '1';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const clients = new Set();
let lastState = { at: null, etag: null, body: null, gz: null };

async function loadState() {
  const body = await fs.readFile(STATE).catch(() => null);
  if (!body) return;
  const etag = `"${(await fs.stat(STATE)).mtimeMs.toString(36)}"`;
  if (etag === lastState.etag) return;
  lastState = { at: new Date().toISOString(), etag, body, gz: zlib.gzipSync(body) };
  const msg = `event: state\ndata: ${JSON.stringify({ etag, at: lastState.at })}\n\n`;
  for (const res of clients) res.write(msg);
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'x-content-type-options': 'nosniff', ...headers });
  res.end(body);
}

async function serveFile(req, res, file) {
  try {
    const st = await fs.stat(file);
    if (!st.isFile()) throw new Error('not file');
    const ext = path.extname(file);
    const immutable = file.includes(`${path.sep}assets${path.sep}`);
    res.writeHead(200, {
      'content-type': TYPES[ext] || 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
    });
    createReadStream(file).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/data/state.json' || url.pathname === '/api/state') {
    if (!lastState.body) await loadState();
    if (!lastState.body) return send(res, 503, 'state not built yet');
    if (req.headers['if-none-match'] === lastState.etag) return send(res, 304, '');
    const gzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    return send(res, 200, gzip ? lastState.gz : lastState.body, {
      'content-type': 'application/json', 'cache-control': 'no-cache', etag: lastState.etag,
      ...(gzip ? { 'content-encoding': 'gzip' } : {}), vary: 'accept-encoding',
    });
  }
  if (url.pathname === '/api/stream') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(`retry: 10000\nevent: hello\ndata: ${JSON.stringify({ etag: lastState.etag })}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (url.pathname === '/api/health') {
    return send(res, 200, JSON.stringify({ ok: true, stateAt: lastState.at, clients: clients.size, collector: COLLECT }), { 'content-type': 'application/json' });
  }
  const rel = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(DIST, rel);
  if (file.startsWith(DIST) && (await serveFile(req, res, file))) return;
  if (await serveFile(req, res, path.join(ROOT, 'public', rel))) return;
  if (!path.extname(rel) && (await serveFile(req, res, path.join(DIST, 'index.html')))) return;
  send(res, 404, 'not found');
});

// Keep SSE connections alive through proxies.
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25_000);

let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const result = await runCollectors({ log: (m) => console.log(m) });
    if (result?.ran?.length) {
      await writeState(await buildState());
      await loadState();
    } else if (Date.now() - Date.parse(lastState.at || 0) > 10 * 60_000) {
      // Rebuild periodically even without collection so "last 24h" windows roll forward.
      await writeState(await buildState());
      await loadState();
    }
  } catch (err) {
    console.error('[tick]', err);
  } finally {
    running = false;
  }
}

await writeState(await buildState()).catch((e) => console.error('[state]', e));
await loadState();
// Pick up state rebuilt by another process (cron, CI, manual `npm run state`).
watchFile(STATE, { interval: 3000 }, () => loadState().catch(() => {}));
server.listen(PORT, () => console.log(`[server] http://localhost:${PORT}  collector=${COLLECT ? 'on' : 'off'}`));
if (COLLECT) {
  tick();
  setInterval(tick, TICK_MS);
}

// File-backed store. Everything lives under data/store as JSON so the history is
// diffable, portable and can be committed by a CI job (GitHub Actions mode).
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
export const STORE_DIR = path.join(DATA_DIR, 'store');
export const CURATED_DIR = path.join(DATA_DIR, 'curated');

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

export async function writeJson(file, value, { pretty = true } = {}) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, pretty ? 1 : 0));
  await fs.rename(tmp, file);
}

export const storeFile = (name) => path.join(STORE_DIR, name);
export const curatedFile = (name) => path.join(CURATED_DIR, name);

/** Raw snapshot of fetched content, gzipped, with bounded retention per source. */
export async function saveSnapshot(sourceId, text, { keep = 40 } = {}) {
  const dir = path.join(STORE_DIR, 'snapshots', sourceId);
  await fs.mkdir(dir, { recursive: true });
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}.txt.gz`;
  await fs.writeFile(path.join(dir, name), zlib.gzipSync(text));
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.gz')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) await fs.unlink(path.join(dir, f));
  return name;
}

/** Simple advisory lock so the scheduler and a manual `npm run collect` don't collide. */
export async function withLock(name, fn) {
  const file = storeFile(`.${name}.lock`);
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    const st = await fs.stat(file);
    if (Date.now() - st.mtimeMs < 20 * 60_000) return { skipped: true };
  } catch {}
  await fs.writeFile(file, String(process.pid));
  try {
    return await fn();
  } finally {
    await fs.rm(file, { force: true });
  }
}

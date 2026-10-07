import { execFile } from 'node:child_process';

const UA =
  process.env.MONITOR_UA ||
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 SentinelMonitor/1.0';

/**
 * Fetch with timeout and bounded retries. Never throws: returns a result object
 * so collectors can record failures as source-health data.
 */
export async function fetchResource(url, { timeout = 25000, retries = 1, headers = {}, binary = false } = {}) {
  let last;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const started = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: 'follow',
        headers: { 'user-agent': UA, accept: '*/*', 'accept-language': 'ru,en;q=0.8', ...headers },
      });
      const body = binary ? new Uint8Array(await res.arrayBuffer()) : await res.text();
      last = { ok: res.ok, status: res.status, body, ms: Date.now() - started, url: res.url };
      if (res.ok) return last;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
    } catch (err) {
      last = { ok: false, status: 0, body: binary ? new Uint8Array() : '', ms: Date.now() - started, error: err.cause?.code || err.name || String(err) };
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await sleep(1500 * 2 ** attempt);
  }
  // Some CDNs reject Node's TLS/HTTP fingerprint (403) or send oversized headers.
  // curl, when installed, usually gets through; use it as a fallback.
  if (!last.ok && (last.status === 403 || /HEADERS_OVERFLOW|ECONNRESET/.test(last.error || '')) && process.env.DISABLE_CURL_FALLBACK !== '1') {
    const viaCurl = await curlFetch(url, { timeout, headers, binary });
    if (viaCurl) return viaCurl;
  }
  return last;
}

function curlFetch(url, { timeout, headers, binary }) {
  const args = ['-sS', '-L', '--compressed', '-m', String(Math.ceil(timeout / 1000)), '-A', UA.replace(/ SentinelMonitor\/[\d.]+/, ''), '-w', '\n%{http_code}'];
  for (const [k, v] of Object.entries(headers)) args.push('-H', `${k}: ${v}`);
  args.push(url);
  const started = Date.now();
  return new Promise((resolve) => {
    execFile('curl', args, { encoding: binary ? 'buffer' : 'utf8', maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
      if (err && !stdout?.length) return resolve(null);
      const buf = binary ? stdout : Buffer.from(stdout, 'utf8');
      const cut = buf.lastIndexOf(10);
      const status = Number(buf.subarray(cut + 1).toString()) || 0;
      const bodyBuf = buf.subarray(0, Math.max(0, cut));
      resolve({ ok: status >= 200 && status < 300, status, body: binary ? new Uint8Array(bodyBuf) : bodyBuf.toString('utf8'), ms: Date.now() - started, url, via: 'curl' });
    });
  });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

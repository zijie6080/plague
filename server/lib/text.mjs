import crypto from 'node:crypto';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…' };

export function decodeEntities(s = '') {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function stripHtml(s = '') {
  return decodeEntities(
    String(s)
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

export const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');
export const shortHash = (s) => sha1(s).slice(0, 12);

/** Normalise text before hashing so cosmetic changes (whitespace, counters) don't trigger diffs. */
export function normalizeForHash(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '')
    .replace(/(просмотр|views?)\s*\d+/gi, '')
    .trim();
}

export function truncate(s, n) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

export function detectLang(s = '') {
  if (/[一-鿿]/.test(s)) return 'zh';
  if (/[а-яё]/i.test(s)) return 'ru';
  return 'en';
}

/** Tokens for near-duplicate clustering. Strips publisher suffix (" - Reuters"). */
export function titleTokens(title) {
  const t = title.replace(/\s[-–—|]\s[^-–—|]{2,40}$/, '').toLowerCase();
  if (/[一-鿿]/.test(t)) {
    const chars = t.replace(/[^一-鿿]/g, '');
    const grams = new Set();
    for (let i = 0; i < chars.length - 1; i++) grams.add(chars.slice(i, i + 2));
    return grams;
  }
  return new Set(t.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3).map((w) => w.slice(0, 6)));
}

export function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

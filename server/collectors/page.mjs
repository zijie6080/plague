// Generic HTML page watcher: hashes the normalised main text to detect changes,
// and optionally extracts article links matching `linkPattern` as documents.
import { fetchResource } from '../lib/http.mjs';
import { stripHtml, normalizeForHash, sha1, truncate, detectLang, shortHash, decodeEntities } from '../lib/text.mjs';

export function extractLinks(html, baseUrl, pattern) {
  const out = new Map();
  const re = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = decodeEntities(m[1]);
    if (!pattern.test(href)) continue;
    const title = stripHtml(m[2]).replace(/\s+/g, ' ').trim();
    if (title.length < 12) continue;
    const url = new URL(href, baseUrl).toString();
    if (!out.has(url) || out.get(url).length < title.length) out.set(url, title);
  }
  return [...out].map(([url, title]) => ({ url, title }));
}

function mainText(html) {
  const body = html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html.match(/<body[\s\S]*<\/body>/i)?.[0] || html;
  return stripHtml(body.replace(/<(header|footer|nav)[\s\S]*?<\/\1>/gi, ' '));
}

export async function run(source) {
  const res = await fetchResource(source.url, { timeout: 30000 });
  if (!res.ok) return { ok: false, status: res.status, ms: res.ms, error: res.error || `HTTP ${res.status}` };
  const text = mainText(res.body);
  if (text.length < 200) return { ok: false, status: res.status, ms: res.ms, error: 'page body too short (blocked or JS-only?)' };
  const items = source.linkPattern
    ? extractLinks(res.body, source.url, source.linkPattern).slice(0, 60).map((l) => ({
        id: shortHash(l.url),
        url: l.url,
        title: truncate(l.title, 220),
        summary: '',
        publishedAt: null,
        publisher: source.name.en,
        publisherHost: new URL(source.url).hostname.replace(/^www\./, ''),
        lang: detectLang(l.title),
      }))
    : [];
  return { ok: true, status: res.status, ms: res.ms, items, pageText: text, pageHash: sha1(normalizeForHash(text)), raw: text };
}

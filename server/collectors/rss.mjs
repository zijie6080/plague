import { XMLParser } from 'fast-xml-parser';
import { fetchResource } from '../lib/http.mjs';
import { stripHtml, hostOf, detectLang, shortHash, truncate } from '../lib/text.mjs';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#text', trimValues: true });
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const txt = (x) => (x == null ? '' : typeof x === 'object' ? x['#text'] ?? '' : String(x));

export function parseFeed(xml) {
  const doc = parser.parse(xml);
  if (doc.rss) {
    return arr(doc.rss.channel?.item).map((it) => ({
      title: stripHtml(txt(it.title)),
      url: txt(it.link) || txt(it.guid),
      summary: longer(stripHtml(txt(it.description)), stripHtml(txt(it['content:encoded']))),
      publishedAt: it.pubDate ? new Date(txt(it.pubDate)).toISOString() : null,
      publisher: txt(it.source) || null,
      publisherUrl: it.source?.['@url'] || null,
    }));
  }
  if (doc.feed) {
    return arr(doc.feed.entry).map((it) => {
      const link = arr(it.link).find((l) => !l['@rel'] || l['@rel'] === 'alternate') || arr(it.link)[0];
      return {
        title: stripHtml(txt(it.title)),
        url: link?.['@href'] || '',
        summary: stripHtml(txt(it.summary) || txt(it.content)),
        publishedAt: new Date(txt(it.published) || txt(it.updated)).toISOString(),
        publisher: null,
        publisherUrl: null,
      };
    });
  }
  throw new Error('unrecognised feed format');
}

export async function run(source) {
  const res = await fetchResource(source.url);
  if (!res.ok) return { ok: false, status: res.status, ms: res.ms, error: res.error || `HTTP ${res.status}` };
  let entries;
  try {
    entries = parseFeed(res.body);
  } catch (err) {
    return { ok: false, status: res.status, ms: res.ms, error: `parse: ${err.message}` };
  }
  const items = entries
    .filter((e) => e.title && e.url)
    .map((e) => {
      // Aggregators (Google News) put the real publisher in <source> and a title suffix.
      const publisherHost = e.publisherUrl ? hostOf(e.publisherUrl) : hostOf(e.url);
      const title = source.aggregator && e.publisher ? e.title.replace(new RegExp(`\\s[-–—]\\s${escapeRe(e.publisher)}$`), '') : e.title;
      return {
        id: shortHash(source.aggregator ? `${publisherHost}|${title.toLowerCase()}` : e.url),
        url: e.url,
        title,
        summary: source.aggregator ? '' : truncate(e.summary, 420),
        publishedAt: e.publishedAt && !Number.isNaN(Date.parse(e.publishedAt)) ? e.publishedAt : null,
        publisher: e.publisher || source.name.en,
        publisherHost: publisherHost || hostOf(source.url),
        lang: detectLang(title),
      };
    });
  return { ok: true, status: res.status, ms: res.ms, items, raw: res.body };
}

const longer = (a, b) => (b.length > a.length ? b : a);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

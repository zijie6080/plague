// PDF watcher: extracts text from each configured PDF, hashes it and stores the
// text so changes (e.g. a revised WHO DON or a regional order) become diffs.
import { extractText, getDocumentProxy } from 'unpdf';
import { fetchResource } from '../lib/http.mjs';
import { sha1, normalizeForHash, truncate, shortHash, detectLang } from '../lib/text.mjs';

export async function pdfToText(bytes) {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

export async function run(source) {
  if (!source.urls?.length) return { ok: true, status: 0, ms: 0, items: [], idle: true };
  const items = [];
  const texts = [];
  let ms = 0;
  for (const url of source.urls) {
    const res = await fetchResource(url, { binary: true, timeout: 45000 });
    ms += res.ms;
    if (!res.ok) return { ok: false, status: res.status, ms, error: `${url}: ${res.error || 'HTTP ' + res.status}` };
    const text = await pdfToText(res.body);
    texts.push(text);
    const first = text.split('\n').find((l) => l.trim().length > 15) || url;
    items.push({ id: shortHash(url), url, title: truncate(first.trim(), 200), summary: truncate(text.replace(/\s+/g, ' '), 600), publishedAt: null, publisher: source.name.en, publisherHost: new URL(url).hostname, lang: detectLang(text) });
  }
  const all = texts.join('\n\n');
  return { ok: true, status: 200, ms, items, pageText: all, pageHash: sha1(normalizeForHash(all)), raw: all };
}

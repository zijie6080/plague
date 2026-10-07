// Public Telegram channels expose a server-rendered preview at t.me/s/<channel>.
import { fetchResource } from '../lib/http.mjs';
import { stripHtml, truncate, detectLang, shortHash } from '../lib/text.mjs';

export function parseTelegram(html, channel) {
  const out = [];
  const blocks = html.split('<div class="tgme_widget_message_wrap').slice(1);
  for (const b of blocks) {
    const post = b.match(/data-post="([^"]+)"/)?.[1];
    const textHtml = b.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    const dt = b.match(/<time[^>]+datetime="([^"]+)"/)?.[1];
    if (!post || !textHtml) continue;
    const text = stripHtml(textHtml);
    const firstLine = text.split('\n').map((s) => s.trim()).find((s) => s.length > 8) || text;
    out.push({
      id: shortHash(`tg|${post}`),
      url: `https://t.me/${post}`,
      title: truncate(firstLine, 180),
      summary: truncate(text, 900),
      publishedAt: dt ? new Date(dt).toISOString() : null,
      publisher: channel,
      publisherHost: 't.me',
      lang: detectLang(text),
    });
  }
  return out;
}

export async function run(source) {
  const res = await fetchResource(`https://t.me/s/${source.channel}`);
  if (!res.ok) return { ok: false, status: res.status, ms: res.ms, error: res.error || `HTTP ${res.status}` };
  const items = parseTelegram(res.body, source.channel).map((i) => ({ ...i, publisher: source.name.en }));
  if (!items.length) return { ok: false, status: res.status, ms: res.ms, error: 'no posts parsed (layout change?)' };
  return { ok: true, status: res.status, ms: res.ms, items, raw: items.map((i) => `${i.publishedAt} ${i.summary}`).join('\n\n') };
}

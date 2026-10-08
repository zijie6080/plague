import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed } from '../collectors/rss.mjs';
import { parseTelegram } from '../collectors/telegram.mjs';
import { extractLinks } from '../collectors/page.mjs';
import { extractOffers, packSize, summarise } from '../collectors/asna.mjs';
import { classifyDomain, isRelevant, topicTags } from '../lib/classify.mjs';
import { isDue, addedLines, ingestPharma } from '../lib/pipeline.mjs';
import { metricRules, pharmaPriceRules, pharmaStockRules, newsRules, extractFigures, detectAnomalies } from '../lib/anomaly.mjs';
import { clusterNews, buildDaily, summariseMetric } from '../lib/state.mjs';

test('parseFeed reads RSS with Google News <source>', () => {
  const xml = `<rss><channel><item><title>Russia says no plague - Reuters</title><link>https://news.google.com/x</link>
    <pubDate>Wed, 07 Oct 2026 14:32:00 GMT</pubDate><source url="https://www.reuters.com">Reuters</source></item></channel></rss>`;
  const [e] = parseFeed(xml);
  assert.equal(e.publisher, 'Reuters');
  assert.equal(e.publisherUrl, 'https://www.reuters.com');
  assert.equal(e.publishedAt, '2026-10-07T14:32:00.000Z');
});

test('parseFeed reads Atom', () => {
  const xml = `<feed><entry><title>X</title><link href="https://a.org/1"/><updated>2026-10-06T10:00:00Z</updated></entry></feed>`;
  assert.equal(parseFeed(xml)[0].url, 'https://a.org/1');
});

test('parseTelegram extracts posts', () => {
  const html = `<div class="tgme_widget_message_wrap"><div data-post="rospotrebnadzor_ru/4893"><div class="tgme_widget_message_text js-message_text" dir="auto">Роспотребнадзор: <b>чума</b> не выявлена</div><time datetime="2026-10-07T10:34:00+00:00"></time></div></div>`;
  const [p] = parseTelegram(html, 'rospotrebnadzor_ru');
  assert.equal(p.url, 'https://t.me/rospotrebnadzor_ru/4893');
  assert.match(p.title, /чума не выявлена/);
  assert.equal(p.lang, 'ru');
});

test('extractLinks keeps matching article links with titles', () => {
  const html = '<a href="/emergencies/disease-outbreak-news/item/2026-DON600">Plague - Russian Federation update</a><a href="/other">Other link text here</a>';
  const links = extractLinks(html, 'https://www.who.int/emergencies/disease-outbreak-news', /disease-outbreak-news\/item\//);
  assert.deepEqual(links, [{ url: 'https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON600', title: 'Plague - Russian Federation update' }]);
});

test('ASNA offers and summary', () => {
  const data = { props: { pageProps: { x: { data: [
    { id: 1, name: 'Доксициклин Экспресс 100мг 20 шт. таблетки', available_count: 3, price: { price: 640, old: 640, preorder: false }, recipe: true },
    { id: 2, name: 'Доксициклин Экспресс 100мг 10 шт.', available_count: 0, price: { price: 300, old: 300, preorder: true }, recipe: true },
  ] } } } };
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`;
  const offers = extractOffers(html);
  assert.equal(offers.length, 2);
  assert.equal(packSize(offers[0].name), 20);
  const s = summarise(offers);
  assert.equal(s.inStock, 1);
  assert.equal(s.preorder, 1);
  assert.equal(s.medianUnit, 31);
});

test('domain classification and relevance', () => {
  assert.equal(classifyDomain('www.who.int'.replace('www.', '')), 'intl');
  assert.equal(classifyDomain('news.un.org'), 'intl');
  assert.equal(classifyDomain('epochtimes.com'), 'caution');
  assert.equal(classifyDomain('tass.ru'), 'state_media');
  assert.equal(classifyDomain('unknown-blog.example'), 'media');
  assert.ok(isRelevant('Suspected plague death in Irkutsk'));
  assert.ok(isRelevant('В Иркутске введён карантин после пневмонии'));
  assert.ok(!isRelevant('Weather in Moscow'));
  assert.deepEqual(topicTags('WHO seeks clarity on second case'), ['second-case', 'who']);
});

test('isDue honours interval and failure backoff', () => {
  const now = Date.parse('2026-10-07T12:00:00Z');
  const src = { every: 10 };
  assert.ok(isDue(src, undefined, now));
  assert.ok(!isDue(src, { lastRun: '2026-10-07T11:55:00Z' }, now));
  assert.ok(isDue(src, { lastRun: '2026-10-07T11:49:00Z' }, now));
  assert.ok(!isDue(src, { lastRun: '2026-10-07T11:45:00Z', consecutiveFailures: 3 }, now)); // 4x backoff = 40 min
});

test('addedLines returns only new substantial lines', () => {
  assert.deepEqual(addedLines('old line that is long enough\nshort', 'old line that is long enough\nnew line describing an update'), ['new line describing an update']);
});

test('metric rules: severity follows meaning', () => {
  const now = Date.parse('2026-10-07T20:00:00Z');
  const metrics = [
    { id: 'deaths', concern: 'up', label: { en: 'Deaths', zh: '死亡' }, observations: [
      { t: '2026-10-02T00:00:00Z', value: 1, tier: 'confirmed' }, { t: '2026-10-07T10:00:00Z', value: 2, tier: 'confirmed' }] },
    { id: 'tests', concern: 'none', label: { en: 'Tests', zh: '检测' }, observations: [{ t: '2026-10-07T10:00:00Z', value: 5000, tier: 'confirmed' }] },
    { id: 'observation', concern: 'up', label: { en: 'Obs', zh: '观察' }, observations: [
      { t: '2026-10-06T10:00:00Z', value: 197, tier: 'reported' }, { t: '2026-10-07T10:00:00Z', value: 20, tier: 'reported' }] },
  ];
  const out = metricRules(metrics, now);
  const by = Object.fromEntries(out.map((s) => [s.subject.metric, s.severity]));
  assert.equal(by.deaths, 'alert');
  assert.equal(by.tests, 'info');
  assert.equal(by.observation, 'info');
});

test('pharma price rule flags local rise and downgrades national drift', () => {
  const s = (idx) => [{ t: '2026-10-07T00:00:00Z', index: 100 }, { t: '2026-10-07T03:00:00Z', index: idx }];
  const local = pharmaPriceRules({ series: { 'doxycycline|irkutsk': s(130), 'doxycycline|moscow': s(101) }, skus: {} });
  assert.equal(local.find((x) => x.subject.city === 'irkutsk').severity, 'alert');
  const drift = pharmaPriceRules({ series: { 'doxycycline|irkutsk': s(115), 'doxycycline|moscow': s(114) }, skus: {} });
  assert.equal(drift.find((x) => x.subject.city === 'irkutsk').severity, 'info');
});

test('pharma stock rule detects sell-out', () => {
  const now = Date.parse('2026-10-07T12:00:00Z');
  const series = { 'doxycycline|irkutsk': [
    { t: '2026-10-07T03:00:00Z', inStock: 4, avail: 16 }, { t: '2026-10-07T06:00:00Z', inStock: 3, avail: 10 }, { t: '2026-10-07T09:00:00Z', inStock: 0, avail: 0 }] };
  const [sig] = pharmaStockRules({ series }, now);
  assert.equal(sig.severity, 'alert');
});

test('ingestPharma computes a same-SKU chained index', () => {
  const ph = { series: {}, skus: {}, latest: {} };
  const offers = (p) => [{ sku: 'a', name: 'A 10 шт', price: p, available: 1, preorder: false }];
  ingestPharma(ph, [{ drug: 'd', city: 'irkutsk', url: 'u', offers: offers(100), summary: { inStock: 1 } }], '2026-10-07T00:00:00Z');
  ingestPharma(ph, [{ drug: 'd', city: 'irkutsk', url: 'u', offers: offers(120), summary: { inStock: 1 } }], '2026-10-07T03:00:00Z');
  assert.equal(ph.series['d|irkutsk'].at(-1).index, 120);
});

test('news rules: claim traction counts distinct publishers', () => {
  const now = Date.parse('2026-10-07T12:00:00Z');
  const docs = ['a.com', 'b.com', 'c.com', 'c.com'].map((h, i) => ({ id: String(i), relevant: true, kind: 'news', topics: ['second-case'], publisherHost: h, publishedAt: '2026-10-07T10:00:00Z' }));
  const sig = newsRules(docs, now).find((s) => s.rule === 'claim_traction');
  assert.equal(sig.value, 3);
});

test('extractFigures finds counts in official text', () => {
  const f = extractFigures('Проведено 4 950 лабораторных исследований, возбудители не обнаружены');
  assert.equal(f[0].kind, 'tests');
  assert.equal(f[0].value, 4950);
});

test('detectAnomalies is idempotent and deactivates stale signals', () => {
  const now = new Date('2026-10-07T12:00:00Z');
  const metrics = [{ id: 'deaths', concern: 'up', label: { en: 'D', zh: 'D' }, observations: [{ t: '2026-10-07T10:00:00Z', value: 1, tier: 'confirmed' }] }];
  const a = detectAnomalies({ metrics, now });
  const b = detectAnomalies({ prev: a, metrics, now });
  assert.equal(a.length, b.length);
  assert.equal(b[0].firstSeen, a[0].firstSeen);
  const later = detectAnomalies({ prev: b, metrics, now: new Date('2026-10-12T12:00:00Z') });
  assert.equal(later[0].active, false);
});

test('clusterNews groups near-duplicate headlines', () => {
  const docs = [
    { id: '1', title: 'WHO seeks clarity from Russia about suspected plague death - AP', publishedAt: '2026-10-07T12:00:00Z', publisherHost: 'apnews.com' },
    { id: '2', title: 'WHO seeks clarity from Russia about suspected plague death, possible second case', publishedAt: '2026-10-07T11:00:00Z', publisherHost: 'washingtontimes.com' },
    { id: '3', title: 'Pharmacies in Irkutsk run out of antibiotics', publishedAt: '2026-10-07T10:00:00Z', publisherHost: 'x.ru' },
  ];
  const c = clusterNews(docs);
  assert.equal(c.length, 2);
  assert.equal(c[0].also.length, 1);
});

test('summariseMetric headline uses confirmed tier only', () => {
  const m = summariseMetric({ id: 'x', label: {}, definition: {}, observations: [
    { t: '2026-10-02T00:00:00Z', value: 197, tier: 'reported', sources: [] }] }, Date.now());
  assert.equal(m.headline, null);
  assert.equal(m.tiers.reported.value, 197);
});

test('buildDaily reports metric changes within 24h', () => {
  const nowMs = Date.parse('2026-10-07T20:00:00Z');
  const d = buildDaily({
    metrics: [{ id: 'tests', label: {}, observations: [{ t: '2026-10-07T11:00:00Z', value: 5000, tier: 'confirmed' }] }],
    events: [], bulletins: [], newsDocs: [], anomalies: [], pharmaOut: { series: {} }, nowMs,
  });
  assert.deepEqual(d.metricChanges.map((c) => [c.metric, c.from, c.to]), [['tests', null, 5000]]);
});

test('tabletka parser reads price range and pharmacy count', async () => {
  const { parseTabletka } = await import('../collectors/tabletka.mjs');
  const row = `<tr class="tr-border"><td class="btn"><div itemid="3538"></div></td><td class="name tooltip-info"><a href="/x">Доксициклин </a></td>
    <td class="form tooltip-info"><div class="tooltip-info-header"> <a href="/r">капсулы 100мг N10</a></div><span> Без рецепта </span></td>
    <td class="price"><span class="price-value">3.06 ... 3.94 р.</span><a href="/r">в 3418 аптеках </a></td></tr>`;
  const [o] = parseTabletka(`<table>${row}${row}</table>`);
  assert.equal(o.name, 'Доксициклин капсулы 100мг N10');
  assert.equal(o.price, 3.06);
  assert.equal(o.priceMax, 3.94);
  assert.equal(o.available, 3418);
  assert.equal(o.rx, false);
});

test('price jump ignores products missing from the latest listing', () => {
  const series = { 'ciprofloxacin|shelekhov': [{ t: 'T1', index: 100 }, { t: 'T2', index: 100 }] };
  const skus = {
    'shelekhov|1': { drug: 'ciprofloxacin', city: 'shelekhov', name: 'eye drops', prev: { price: 71 }, last: { t: 'T1', price: 126 } },
    'shelekhov|2': { drug: 'ciprofloxacin', city: 'shelekhov', name: 'tabs', prev: { price: 100 }, last: { t: 'T2', price: 130 } },
  };
  const jumps = pharmaPriceRules({ series, skus }).filter((x) => x.rule === 'price_jump');
  assert.equal(jumps.length, 1);
  assert.match(jumps[0].detail.en, /tabs/);
});

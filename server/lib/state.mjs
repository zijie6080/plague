// Assembles the single public JSON document the front-end renders.
import fs from 'node:fs/promises';
import path from 'node:path';
import { SOURCES } from '../config/sources.mjs';
import { DRUGS, CITIES } from '../config/drugs.mjs';
import { readJson, writeJson, storeFile, curatedFile, ROOT } from './store.mjs';
import { titleTokens, jaccard } from './text.mjs';

const H = 3_600_000;

export async function buildState({ now = new Date() } = {}) {
  const [briefing, metricsDoc, eventsDoc, locDoc, bulletinsDoc, citations] = await Promise.all([
    readJson(curatedFile('briefing.json'), {}),
    readJson(curatedFile('metrics.json'), { metrics: [] }),
    readJson(curatedFile('events.json'), { events: [] }),
    readJson(curatedFile('locations.json'), { locations: [] }),
    readJson(curatedFile('bulletins.json'), { bulletins: [] }),
    readJson(curatedFile('citations.json'), {}),
  ]);
  const [docsMap, health, pharma, anomalies, pages] = await Promise.all([
    readJson(storeFile('documents.json'), {}),
    readJson(storeFile('sources.json'), {}),
    readJson(storeFile('pharma.json'), { series: {}, latest: {}, skus: {} }),
    readJson(storeFile('anomalies.json'), []),
    readJson(storeFile('pages.json'), {}),
  ]);
  delete citations._doc;
  const nowMs = now.getTime();
  const docs = Object.values(docsMap).filter((d) => d.relevant);

  const metrics = metricsDoc.metrics.map((m) => summariseMetric(m, nowMs));
  const events = [...eventsDoc.events].sort((a, b) => Date.parse(b.t) - Date.parse(a.t));

  const autoBulletins = docs
    .filter((d) => d.kind === 'bulletin')
    .map((d) => ({
      id: `auto-${d.id}`, t: d.publishedAt || d.firstSeen, org: d.org, sourceType: d.sourceType, auto: true,
      issuer: { en: d.publisher, zh: d.publisher }, title: { en: d.title, zh: d.title, orig: d.title }, lang: d.lang,
      summary: d.summary, url: d.url, points: [], sources: [],
    }));
  // Drop automated items that duplicate a curated statement from the same issuer within 36h.
  const curatedKeys = bulletinsDoc.bulletins.map((b) => ({ org: b.org, t: Date.parse(b.t) }));
  const dedupedAuto = autoBulletins.filter((a) => !curatedKeys.some((c) => c.org === a.org && Math.abs(c.t - Date.parse(a.t)) < 36 * H));
  const bulletins = [...bulletinsDoc.bulletins, ...dedupedAuto].sort((a, b) => Date.parse(b.t) - Date.parse(a.t)).slice(0, 120);

  const newsDocs = docs.filter((d) => d.kind === 'news').sort((a, b) => docTime(b) - docTime(a));
  const news = clusterNews(newsDocs).slice(0, 300);
  const newsVolume = volumeSeries(newsDocs, nowMs);

  const pharmaOut = buildPharma(pharma);

  const sources = SOURCES.map((s) => {
    const h = health[s.id] || {};
    const status = !h.lastRun ? 'pending' : h.idle ? 'idle' : !h.lastOk ? 'down' : h.consecutiveFailures >= 1 ? (h.consecutiveFailures >= 3 ? 'down' : 'degraded') : h.lastError ? 'degraded' : 'ok';
    return {
      id: s.id, name: s.name, kind: s.kind, sourceType: s.sourceType, every: s.every, note: s.note || null,
      url: s.homepage || s.url || null, status,
      lastRun: h.lastRun || null, lastOk: h.lastOk || null, lastMs: h.lastMs ?? null, lastError: h.lastError || null,
      items: h.lastItems ?? null, failures: h.consecutiveFailures || 0,
      nextRun: h.lastRun ? new Date(Date.parse(h.lastRun) + s.every * 60_000 * Math.min(8, 2 ** Math.max(0, (h.consecutiveFailures || 0) - 1))).toISOString() : null,
      runs: (h.runs || []).slice(0, 48).map((r) => ({ t: r.t, ok: r.ok, ms: r.ms, n: r.n, fresh: r.fresh })),
      pageChangedAt: pages[s.id]?.changedAt || null,
    };
  });

  const activeAnomalies = anomalies.filter((a) => a.active);
  const recentAnomalies = anomalies.filter((a) => !a.active && nowMs - Date.parse(a.t || a.lastSeen) < 14 * 24 * H).slice(0, 60);

  const daily = buildDaily({ metrics: metricsDoc.metrics, events, bulletins, newsDocs, anomalies, pharmaOut, nowMs });

  const lastDataAt = [briefing.updatedAt, events[0]?.t, ...sources.map((s) => s.lastOk)].filter(Boolean).sort().at(-1);

  return {
    schema: 2,
    generatedAt: now.toISOString(),
    lastDataAt,
    event: {
      id: 'irkutsk-2026',
      start: '2026-09-25',
      title: { zh: '伊尔库茨克疑似鼠疫事件', en: 'Irkutsk suspected plague event' },
      place: { zh: '俄罗斯 · 伊尔库茨克州', en: 'Irkutsk Oblast, Russia' },
    },
    briefing,
    risk: metricsDoc.risk,
    metrics,
    events,
    locations: locDoc.locations,
    regions: locDoc.regions,
    countries: locDoc.countries,
    bulletins,
    news,
    newsVolume,
    pharma: pharmaOut,
    anomalies: { active: activeAnomalies, recent: recentAnomalies },
    sources,
    daily,
    citations,
  };
}

const docTime = (d) => Date.parse(d.publishedAt || d.firstSeen);

export function summariseMetric(m, nowMs) {
  const obs = [...m.observations].sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  const latest = {};
  for (const o of obs) latest[o.tier] = o;
  const headline = latest.confirmed?.value != null ? latest.confirmed : null;
  return {
    id: m.id, label: m.label, definition: m.definition,
    headline: headline ? { value: headline.value, approx: !!headline.approx, t: headline.t, tier: 'confirmed' } : null,
    tiers: Object.fromEntries(Object.entries(latest).map(([tier, o]) => [tier, { value: o.value, approx: !!o.approx, delta: !!o.delta, t: o.t, text: o.text || null, note: o.note || null, sources: o.sources }])),
    history: obs.map((o) => ({ t: o.t, value: o.value, tier: o.tier, approx: !!o.approx, delta: !!o.delta, sources: o.sources, note: o.note || null, text: o.text || null })),
    changed24h: obs.some((o) => nowMs - Date.parse(o.t) < 24 * H),
  };
}

export function clusterNews(docs) {
  const clusters = [];
  for (const d of docs) {
    const tokens = titleTokens(d.title);
    const t = docTime(d);
    let match = null;
    for (const c of clusters) {
      if (Math.abs(c.t - t) > 48 * H) continue;
      if (jaccard(c.tokens, tokens) >= 0.5) { match = c; break; }
    }
    const entry = { id: d.id, title: d.title, url: d.url, publisher: d.publisher, host: d.publisherHost, sourceType: d.sourceType, t: new Date(t).toISOString(), lang: d.lang };
    if (match) match.also.push(entry);
    else clusters.push({ ...entry, tokens, topics: d.topics || [], summary: d.summary || '', firstSeen: d.firstSeen, also: [] });
  }
  return clusters.map(({ tokens, t, ...c }) => ({ ...c, t: c.t || new Date(t).toISOString() }));
}

export function volumeSeries(docs, nowMs) {
  const hours = 24 * 7;
  const start = Math.floor(nowMs / H) * H - (hours - 1) * H;
  const buckets = Array.from({ length: hours }, (_, i) => ({ t: new Date(start + i * H).toISOString(), total: 0, official: 0, media: 0, caution: 0 }));
  for (const d of docs) {
    const i = Math.floor((docTime(d) - start) / H);
    if (i < 0 || i >= hours) continue;
    const b = buckets[i];
    b.total++;
    if (d.sourceType === 'caution') b.caution++;
    else if (d.sourceType === 'official' || d.sourceType === 'intl') b.official++;
    else b.media++;
  }
  return buckets;
}

function downsample(series, max = 240) {
  if (series.length <= max) return series;
  const step = series.length / max;
  const out = [];
  for (let i = 0; i < max; i++) out.push(series[Math.floor(i * step)]);
  out[out.length - 1] = series[series.length - 1];
  return out;
}

export function buildPharma(pharma) {
  const series = {};
  for (const [key, s] of Object.entries(pharma.series || {})) {
    series[key] = downsample(s).map((p) => ({ t: p.t, index: p.index, medianUnit: p.medianUnit != null ? Math.round(p.medianUnit * 100) / 100 : null, minPrice: p.minPrice, medianPrice: p.medianPrice, inStock: p.inStock, skus: p.skus, avail: p.avail, preorder: p.preorder }));
  }
  const latest = {};
  for (const [key, l] of Object.entries(pharma.latest || {})) {
    latest[key] = { t: l.t, url: l.url, offers: l.offers.slice(0, 12).map((o) => ({ name: o.name, price: o.price, available: o.available, preorder: o.preorder, rx: o.rx, firstPrice: pharma.skus?.[`${key.split('|')[1]}|${o.sku}`]?.first?.price ?? null })) };
  }
  const allTimes = Object.values(pharma.series || {}).flat().map((p) => p.t).sort();
  return {
    drugs: DRUGS.map((d) => ({ id: d.id, name: d.name, role: d.role })),
    cities: CITIES.map((c) => ({ id: c.id, name: c.name, role: c.role })),
    since: allTimes[0] || null,
    lastAt: allTimes.at(-1) || null,
    observations: allTimes.length,
    series,
    latest,
  };
}

function valueAt(observations, tier, ts) {
  let v = null;
  for (const o of [...observations].sort((a, b) => Date.parse(a.t) - Date.parse(b.t))) {
    if (o.tier !== tier || Date.parse(o.t) > ts) continue;
    v = o.value;
  }
  return v;
}

export function buildDaily({ metrics, events, bulletins, newsDocs, anomalies, pharmaOut, nowMs }) {
  const since = nowMs - 24 * H;
  const metricChanges = [];
  for (const m of metrics) {
    for (const tier of ['confirmed', 'suspected', 'reported', 'unverified']) {
      const now = valueAt(m.observations, tier, nowMs);
      const then = valueAt(m.observations, tier, since);
      const touched = m.observations.some((o) => o.tier === tier && Date.parse(o.t) > since);
      if (touched && (now !== then)) metricChanges.push({ metric: m.id, label: m.label, tier, from: then, to: now });
      else if (touched && now == null) {
        const o = m.observations.filter((x) => x.tier === tier && Date.parse(x.t) > since).at(-1);
        if (o?.text) metricChanges.push({ metric: m.id, label: m.label, tier, from: null, to: null, text: o.text });
      }
    }
  }
  const newEvents = events.filter((e) => Date.parse(e.t) > since).sort((a, b) => b.importance - a.importance || Date.parse(b.t) - Date.parse(a.t));
  const newBulletins = bulletins.filter((b) => Date.parse(b.t) > since);
  const news24 = newsDocs.filter((d) => docTime(d) > since).length;
  const newsPrev = newsDocs.filter((d) => docTime(d) <= since && docTime(d) > since - 24 * H).length;
  const anomalies24 = anomalies.filter((a) => Date.parse(a.firstSeen || a.t) > since && a.active);

  const pharmaMoves = [];
  for (const [key, s] of Object.entries(pharmaOut.series)) {
    const [drug, city] = key.split('|');
    if (city === 'moscow' || s.length < 2) continue;
    const last = s.at(-1);
    const ref = [...s].reverse().find((p) => Date.parse(p.t) <= since) || s[0];
    if (last.index == null || ref.index == null) continue;
    const d = last.index - ref.index;
    const stockD = last.inStock - ref.inStock;
    if (Math.abs(d) >= 3 || stockD !== 0) pharmaMoves.push({ drug, city, indexFrom: ref.index, indexTo: last.index, stockFrom: ref.inStock, stockTo: last.inStock });
  }

  return {
    since: new Date(since).toISOString(),
    metricChanges,
    events: newEvents.map((e) => e.id),
    bulletins: newBulletins.map((b) => b.id),
    news: { last24h: news24, prev24h: newsPrev },
    anomalies: anomalies24.map((a) => a.id),
    pharma: pharmaMoves.sort((a, b) => Math.abs(b.indexTo - b.indexFrom) - Math.abs(a.indexTo - a.indexFrom)).slice(0, 6),
  };
}

export async function writeState(state) {
  const targets = [path.join(ROOT, 'public/data/state.json')];
  try {
    await fs.access(path.join(ROOT, 'dist'));
    targets.push(path.join(ROOT, 'dist/data/state.json'));
  } catch {}
  for (const t of targets) await writeJson(t, state, { pretty: false });
  return targets;
}

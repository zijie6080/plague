// Runs due collectors, records source health, ingests documents, page changes
// and pharmacy observations into the store, then re-runs anomaly detection.
import { SOURCES, EVENT_SINCE } from '../config/sources.mjs';
import { COLLECTORS } from '../collectors/index.mjs';
import { readJson, writeJson, storeFile, curatedFile, saveSnapshot, withLock } from './store.mjs';
import { classifyDomain, isRelevant, topicTags } from './classify.mjs';
import { detectAnomalies } from './anomaly.mjs';
import { truncate } from './text.mjs';

const MAX_RUNS = 96;
const MAX_DOCS = 4000;

export function isDue(source, health, now = Date.now()) {
  const last = health?.lastRun ? Date.parse(health.lastRun) : 0;
  // Back off failing sources: double the interval per consecutive failure, up to 8x.
  const backoff = Math.min(8, 2 ** Math.max(0, (health?.consecutiveFailures || 0) - 1));
  return now - last >= source.every * 60_000 * backoff - 15_000;
}

/** Added lines between two page texts — enough to show "what changed" without a diff library. */
export function addedLines(prev, next) {
  const before = new Set((prev || '').split('\n').map((l) => l.trim()).filter(Boolean));
  return next
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && !before.has(l));
}

export async function runCollectors({ only, force = false, log = console.log } = {}) {
  return withLock('collect', async () => {
    const health = await readJson(storeFile('sources.json'), {});
    const docs = await readJson(storeFile('documents.json'), {});
    const pages = await readJson(storeFile('pages.json'), {});
    const pharma = await readJson(storeFile('pharma.json'), { series: {}, skus: {}, latest: {} });
    const now = new Date();
    const ran = [];

    for (const source of SOURCES) {
      if (only && !only.includes(source.id) && !only.includes(source.kind)) continue;
      const h = (health[source.id] ||= { runs: [] });
      if (!force && !isDue(source, h)) continue;
      const collector = COLLECTORS[source.kind];
      if (!collector) continue;

      let result;
      try {
        result = await collector.run(source);
      } catch (err) {
        result = { ok: false, status: 0, ms: 0, error: `crash: ${err.message}` };
      }
      const t = new Date().toISOString();
      h.lastRun = t;
      h.lastStatus = result.status;
      h.lastMs = result.ms;
      h.lastError = result.ok ? (result.degraded ? result.error : null) : result.error;
      h.idle = !!result.idle;
      if (result.ok) {
        h.lastOk = t;
        h.consecutiveFailures = 0;
      } else {
        h.consecutiveFailures = (h.consecutiveFailures || 0) + 1;
      }

      let fresh = 0;
      let relevantCount = 0;
      if (result.ok && result.items) {
        for (const item of result.items) {
          if (item.publishedAt && item.publishedAt < EVENT_SINCE) continue;
          const text = `${item.title} ${item.summary || ''}`;
          const relevant = isRelevant(text);
          if (source.relevanceFilter && !relevant) continue;
          relevantCount++;
          const sourceType = source.aggregator ? classifyDomain(item.publisherHost) : source.sourceType;
          const existing = docs[item.id];
          if (existing) {
            existing.lastSeen = t;
            if (!existing.seenBy.includes(source.id)) existing.seenBy.push(source.id);
            if (!existing.publishedAt && item.publishedAt) existing.publishedAt = item.publishedAt;
            continue;
          }
          fresh++;
          docs[item.id] = {
            ...item,
            summary: truncate(item.summary, 900),
            sourceType,
            kind: source.bulletin || sourceType === 'official' || sourceType === 'intl' ? 'bulletin' : 'news',
            org: source.org || null,
            topics: topicTags(text),
            relevant,
            firstSeen: t,
            lastSeen: t,
            seenBy: [source.id],
          };
        }
      }

      if (result.ok && result.pageHash) {
        const p = (pages[source.id] ||= { history: [] });
        if (p.hash && p.hash !== result.pageHash) {
          const added = addedLines(p.text, result.pageText).slice(0, 12);
          p.history.unshift({ t, hash: result.pageHash, added, relevant: added.some((l) => isRelevant(l)) });
          p.history = p.history.slice(0, 50);
          p.changedAt = t;
          log(`  ↺ ${source.id}: page changed (+${added.length} lines)`);
        } else if (!p.hash) {
          p.firstSeen = t;
        }
        p.hash = result.pageHash;
        p.text = result.pageText.slice(0, 60_000);
        p.checkedAt = t;
      }

      if (result.pharma) ingestPharma(pharma, result.pharma, t);

      if (result.ok && result.raw && (source.sourceType === 'official' || source.sourceType === 'intl' || source.kind === 'asna')) {
        await saveSnapshot(source.id, typeof result.raw === 'string' ? result.raw : JSON.stringify(result.pharma), { keep: 30 }).catch(() => {});
      }

      h.runs.unshift({ t, ok: !!result.ok, ms: result.ms, n: relevantCount || result.pharma?.length || 0, fresh, status: result.status });
      h.runs = h.runs.slice(0, MAX_RUNS);
      h.lastItems = relevantCount || result.pharma?.length || 0;
      ran.push({ id: source.id, ok: result.ok, fresh, ms: result.ms, error: h.lastError });
      log(`  ${result.ok ? '✓' : '✗'} ${source.id.padEnd(14)} ${String(result.ms ?? 0).padStart(5)}ms  ${result.ok ? `${relevantCount || result.pharma?.length || 0} items, ${fresh} new` : result.error}`);
    }

    pruneDocs(docs);
    await writeJson(storeFile('sources.json'), health);
    await writeJson(storeFile('documents.json'), docs);
    await writeJson(storeFile('pages.json'), pages);
    await writeJson(storeFile('pharma.json'), pharma, { pretty: false });

    const anomalies = await readJson(storeFile('anomalies.json'), []);
    const curatedMetrics = await readJson(curatedFile('metrics.json'), { metrics: [] });
    const next = detectAnomalies({ prev: anomalies, docs, pages, pharma, health, metrics: curatedMetrics.metrics, now });
    await writeJson(storeFile('anomalies.json'), next);

    return { ran, at: now.toISOString() };
  });
}

export function ingestPharma(pharma, results, t) {
  for (const r of results) {
    const key = `${r.drug}|${r.city}`;
    // Same-SKU price relatives against each SKU's first observed price → chained index.
    const rel = [];
    for (const o of r.offers) {
      const skuKey = `${r.city}|${o.sku}`;
      const s = (pharma.skus[skuKey] ||= { drug: r.drug, city: r.city, name: o.name, first: { t, price: o.price } });
      if (!s.first.price && o.price) s.first = { t, price: o.price };
      s.prev = s.last;
      s.last = { t, price: o.price, available: o.available, preorder: o.preorder };
      if (o.price && s.first.price) rel.push(o.price / s.first.price);
    }
    rel.sort((a, b) => a - b);
    const idx = rel.length ? rel[Math.floor(rel.length / 2)] : null;
    const point = { t, ...r.summary, index: idx != null ? Math.round(idx * 1000) / 10 : null };
    (pharma.series[key] ||= []).push(point);
    pharma.series[key] = pharma.series[key].slice(-1500);
    pharma.latest[key] = { t, url: r.url, offers: r.offers.slice(0, 25) };
  }
}

function pruneDocs(docs) {
  const ids = Object.keys(docs);
  if (ids.length <= MAX_DOCS) return;
  ids
    .sort((a, b) => Date.parse(docs[a].publishedAt || docs[a].firstSeen) - Date.parse(docs[b].publishedAt || docs[b].firstSeen))
    .slice(0, ids.length - MAX_DOCS)
    .forEach((id) => delete docs[id]);
}

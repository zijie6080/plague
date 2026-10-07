// Rule-based anomaly detection. Every signal states the rule that fired and the
// numbers behind it, so a reader can judge it rather than trust a black box.
// Severity: info < watch < alert. Signals are idempotent: the same condition on
// the same subject updates one signal instead of creating duplicates.
import { SOURCES } from '../config/sources.mjs';
import { DRUGS, CITIES } from '../config/drugs.mjs';
import { isRelevant } from './classify.mjs';

const H = 3_600_000;
const ACTIVE_WINDOW = 48 * H;
const KEEP = 300;

const drugName = (id) => DRUGS.find((d) => d.id === id)?.name || { en: id, zh: id };
const cityName = (id) => CITIES.find((c) => c.id === id)?.name || { en: id, zh: id };
const sourceName = (id) => SOURCES.find((s) => s.id === id)?.name || { en: id, zh: id };
const pct = (x) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}%`;

export function detectAnomalies({ prev = [], docs = {}, pages = {}, pharma = { series: {}, skus: {} }, health = {}, metrics = [], now = new Date() }) {
  const nowMs = now.getTime();
  const found = [
    ...pharmaPriceRules(pharma),
    ...pharmaStockRules(pharma, nowMs),
    ...newsRules(Object.values(docs), nowMs),
    ...metricRules(metrics, nowMs),
    ...pageRules(pages, nowMs),
    ...figureRules(Object.values(docs), nowMs),
    ...sourceRules(health),
  ];

  const byId = new Map(prev.map((s) => [s.id, { ...s }]));
  const nowIso = now.toISOString();
  for (const s of found) {
    const old = byId.get(s.id);
    byId.set(s.id, { ...s, firstSeen: old?.firstSeen || nowIso, lastSeen: nowIso });
  }
  const firedIds = new Set(found.map((s) => s.id));
  const out = [...byId.values()].map((s) => {
    const recent = nowMs - Date.parse(s.t || s.lastSeen) < ACTIVE_WINDOW;
    return { ...s, active: firedIds.has(s.id) && (recent || s.persistent === true) };
  });
  out.sort((a, b) => Date.parse(b.t || b.lastSeen) - Date.parse(a.t || a.lastSeen));
  return out.slice(0, KEEP);
}

// ---------- Pharmacy ----------
export function pharmaPriceRules(pharma) {
  const out = [];
  for (const [key, series] of Object.entries(pharma.series || {})) {
    const [drug, city] = key.split('|');
    if (series.length < 2) continue;
    const last = series[series.length - 1];
    if (last.index == null) continue;
    const change = last.index - 100;
    const control = pharma.series[`${drug}|moscow`]?.at(-1)?.index;
    const isEpicenter = city !== 'moscow';
    let severity = change >= 25 ? 'alert' : change >= 10 ? 'watch' : null;
    if (!severity) continue;
    let note = { en: '', zh: '' };
    if (isEpicenter && control != null && control - 100 >= change - 5) {
      severity = 'info';
      note = { en: ' Moscow (control) moved similarly, suggesting a national rather than local change.', zh: '莫斯科（对照组）同步变动，更可能是全国性变化，而非当地异常。' };
    }
    out.push({
      id: `price|${key}`, rule: 'price_index', severity, t: last.t, persistent: true,
      subject: { type: 'drug', drug, city },
      value: last.index, baseline: 100,
      title: { en: `${drugName(drug).en} price ${pct(change)} in ${cityName(city).en}`, zh: `${cityName(city).zh}${drugName(drug).zh}价格 ${pct(change)}` },
      detail: {
        en: `Median same-product price relative to first observation is ${last.index.toFixed(1)} (100 = baseline). Thresholds: +10% watch, +25% alert.${note.en}`,
        zh: `同款商品价格中位数较首次观测为 ${last.index.toFixed(1)}（基准 = 100）。阈值：上涨 10% 为关注，上涨 25% 为警报。${note.zh}`,
      },
    });
  }
  // Individual product jumps between consecutive observations in the epicenter.
  const jumps = {};
  for (const s of Object.values(pharma.skus || {})) {
    if (s.city === 'moscow' || !s.prev?.price || !s.last?.price) continue;
    const r = s.last.price / s.prev.price;
    if (r >= 1.15) (jumps[`${s.drug}|${s.city}`] ||= []).push({ name: s.name, from: s.prev.price, to: s.last.price, t: s.last.t });
  }
  for (const [key, list] of Object.entries(jumps)) {
    const [drug, city] = key.split('|');
    const top = list.sort((a, b) => b.to / b.from - a.to / a.from)[0];
    out.push({
      id: `jump|${key}|${top.t.slice(0, 13)}`, rule: 'price_jump', severity: 'watch', t: top.t,
      subject: { type: 'drug', drug, city }, value: top.to, baseline: top.from,
      title: { en: `${list.length} ${drugName(drug).en} product(s) jumped ≥15% in ${cityName(city).en}`, zh: `${cityName(city).zh}有 ${list.length} 款${drugName(drug).zh}商品单次涨幅 ≥15%` },
      detail: { en: `Largest: ${top.name} ₽${top.from} → ₽${top.to}.`, zh: `涨幅最大：${top.name}，₽${top.from} → ₽${top.to}。` },
    });
  }
  return out;
}

export function pharmaStockRules(pharma, nowMs) {
  const out = [];
  for (const [key, series] of Object.entries(pharma.series || {})) {
    const [drug, city] = key.split('|');
    if (series.length < 3) continue;
    const last = series[series.length - 1];
    const window = series.filter((p) => nowMs - Date.parse(p.t) < 72 * H).slice(0, -1);
    if (!window.length) continue;
    const peak = Math.max(...window.map((p) => p.inStock));
    const peakAvail = Math.max(...window.map((p) => p.avail));
    if (peak <= 0) continue;
    const drop = 1 - last.inStock / peak;
    const availDrop = peakAvail > 0 ? 1 - last.avail / peakAvail : 0;
    let severity = null;
    if (last.inStock === 0) severity = 'alert';
    else if (drop >= 0.5 || availDrop >= 0.6) severity = 'watch';
    if (!severity) continue;
    if (city === 'moscow' && severity === 'watch') severity = 'info';
    out.push({
      id: `stock|${key}`, rule: 'availability_drop', severity, t: last.t, persistent: true,
      subject: { type: 'drug', drug, city }, value: last.inStock, baseline: peak,
      title: last.inStock === 0
        ? { en: `${drugName(drug).en}: no in-stock listings in ${cityName(city).en}`, zh: `${cityName(city).zh}${drugName(drug).zh}已无现货在售` }
        : { en: `${drugName(drug).en} availability down ${Math.round(Math.max(drop, availDrop) * 100)}% in ${cityName(city).en}`, zh: `${cityName(city).zh}${drugName(drug).zh}可购量下降 ${Math.round(Math.max(drop, availDrop) * 100)}%` },
      detail: {
        en: `In-stock products ${last.inStock} vs 72h peak ${peak}; availability count ${last.avail} vs peak ${peakAvail}.`,
        zh: `有现货商品 ${last.inStock} 款（72 小时峰值 ${peak} 款）；可购量 ${last.avail}（峰值 ${peakAvail}）。`,
      },
    });
  }
  return out;
}

// ---------- News & claims ----------
const docTime = (d) => Date.parse(d.publishedAt || d.firstSeen);

export function newsRules(docs, nowMs) {
  const out = [];
  const relevant = docs.filter((d) => d.relevant && d.kind === 'news');
  const recent = relevant.filter((d) => nowMs - docTime(d) < 6 * H).length;
  const prior = relevant.filter((d) => {
    const age = nowMs - docTime(d);
    return age >= 6 * H && age < 54 * H;
  }).length;
  const baseline = prior / 8; // per 6h window over the previous 48h
  if (recent >= 8 && recent >= Math.max(2.5 * baseline, baseline + 6)) {
    const bucket = new Date(Math.floor(nowMs / (6 * H)) * 6 * H).toISOString();
    out.push({
      id: `news_spike|${bucket}`, rule: 'news_volume', severity: 'watch', t: new Date(nowMs).toISOString(),
      subject: { type: 'news' }, value: recent, baseline: Math.round(baseline * 10) / 10,
      title: { en: `Coverage spike: ${recent} reports in 6h`, zh: `报道量激增：6 小时内 ${recent} 篇` },
      detail: {
        en: `vs an average of ${baseline.toFixed(1)} per 6h over the previous 48h. Volume measures attention, not severity.`,
        zh: `前 48 小时平均每 6 小时 ${baseline.toFixed(1)} 篇。报道量只反映关注度，不代表事态严重程度。`,
      },
    });
  }
  // A claim spreading across independent publishers before any confirmation.
  const claims = [
    ['second-case', { en: 'second case', zh: '第二例' }],
    ['denial', { en: 'official denial', zh: '官方否认' }],
  ];
  for (const [topic, label] of claims) {
    const hits = relevant.filter((d) => d.topics?.includes(topic) && nowMs - docTime(d) < 24 * H);
    const pubs = new Set(hits.map((d) => d.publisherHost || d.publisher));
    if (pubs.size >= 3) {
      out.push({
        id: `claim|${topic}|${new Date(nowMs).toISOString().slice(0, 10)}`, rule: 'claim_traction',
        severity: topic === 'second-case' ? 'watch' : 'info', t: new Date(Math.max(...hits.map(docTime))).toISOString(),
        subject: { type: 'claim', topic }, value: pubs.size,
        title: { en: `Claim spreading: “${label.en}” — ${pubs.size} outlets in 24h`, zh: `说法扩散中：“${label.zh}”，24 小时内 ${pubs.size} 家媒体提及` },
        detail: {
          en: 'Counts distinct publishers mentioning the claim. Repetition is not confirmation; check the claim\'s tier in the timeline.',
          zh: '统计提及该说法的不同媒体数量。被多次转述不等于被证实，请以时间线中的可信度标签为准。',
        },
      });
    }
  }
  return out;
}

// ---------- Curated metrics ----------
const TIER_SEVERITY = { confirmed: 'alert', suspected: 'watch', reported: 'watch', unverified: 'info', disputed: 'info' };

export function metricRules(metrics, nowMs) {
  const out = [];
  for (const m of metrics) {
    const byTier = {};
    for (const o of [...m.observations].sort((a, b) => Date.parse(a.t) - Date.parse(b.t))) (byTier[o.tier] ||= []).push(o);
    for (const [tier, obs] of Object.entries(byTier)) {
      const last = obs[obs.length - 1];
      const prev = obs[obs.length - 2];
      if (nowMs - Date.parse(last.t) > ACTIVE_WINDOW || last.value == null) continue;
      if (prev && prev.value === last.value) continue;
      const delta = prev?.value != null ? last.value - prev.value : null;
      // Severity follows meaning, not just change: more tests run or fewer people
      // under observation is not a worsening signal and must never read as an alert.
      const worsening = m.concern === 'up' && (delta == null ? last.value > 0 : delta > 0);
      const severity = worsening ? TIER_SEVERITY[tier] || 'info' : 'info';
      const shown = last.delta ? `+${last.value}` : String(last.value);
      out.push({
        id: `metric|${m.id}|${tier}|${last.t}`, rule: 'metric_change', severity, t: last.t,
        subject: { type: 'metric', metric: m.id, tier }, value: last.value, baseline: prev?.value ?? null,
        title: {
          en: `${m.label.en}: ${prev ? `${prev.value} → ` : ''}${shown} (${tier})`,
          zh: `${m.label.zh}：${prev ? `${prev.value} → ` : ''}${shown}（${tierZh(tier)}）`,
        },
        detail: {
          en: delta != null ? `Change of ${delta >= 0 ? '+' : ''}${delta} vs the previous ${tier} figure.` : `New ${tier} figure.`,
          zh: delta != null ? `较上一个“${tierZh(tier)}”数字变化 ${delta >= 0 ? '+' : ''}${delta}。` : `新增“${tierZh(tier)}”数字。`,
        },
      });
    }
  }
  return out;
}

const tierZh = (t) => ({ confirmed: '官方确认', suspected: '疑似', reported: '媒体报道', unverified: '未证实', disputed: '存在争议' })[t] || t;

// ---------- Official pages ----------
export function pageRules(pages, nowMs) {
  const out = [];
  for (const [sourceId, p] of Object.entries(pages)) {
    const src = SOURCES.find((s) => s.id === sourceId);
    if (!src || !['official', 'intl'].includes(src.sourceType)) continue;
    for (const h of p.history || []) {
      if (nowMs - Date.parse(h.t) > ACTIVE_WINDOW) continue;
      out.push({
        id: `page|${sourceId}|${h.hash.slice(0, 10)}`, rule: 'page_change', severity: h.relevant ? 'watch' : 'info', t: h.t,
        subject: { type: 'source', source: sourceId },
        title: { en: `${sourceName(sourceId).en} updated${h.relevant ? ' — mentions the event' : ''}`, zh: `${sourceName(sourceId).zh}页面已更新${h.relevant ? '，内容涉及本事件' : ''}` },
        detail: { en: h.added.slice(0, 3).join(' · ') || 'Content hash changed.', zh: h.added.slice(0, 3).join(' · ') || '页面内容哈希发生变化。' },
        excerpt: h.added.slice(0, 6),
      });
    }
  }
  return out;
}

// ---------- Figures in official text (machine-extracted, pending review) ----------
const FIGURE_PATTERNS = [
  ['contacts', /(\d[\d\s]{0,6}\d|\d)\s*(?:человек|контактн)[^.]{0,60}(?:наблюдени|изоляц|карантин)/i],
  ['tests', /(\d[\d\s]{0,6}\d|\d)\s*(?:лабораторн[а-я]*\s+)?(?:исследовани|анализ|проб)/i],
  ['contacts', /(\d[\d\s]{0,6}\d|\d)\s+(?:contacts?|people)[^.]{0,40}(?:observation|isolation|quarantine)/i],
  ['tests', /(\d[\d,]{0,7}\d|\d)\s+(?:laboratory\s+)?(?:tests|samples)/i],
];

export function extractFigures(text) {
  const out = [];
  for (const [kind, re] of FIGURE_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const value = Number(m[1].replace(/[\s,]/g, ''));
    if (!Number.isFinite(value) || value <= 0 || value > 1e6) continue;
    const i = m.index ?? 0;
    out.push({ kind, value, snippet: text.slice(Math.max(0, i - 60), i + m[0].length + 60).replace(/\s+/g, ' ').trim() });
  }
  return out;
}

export function figureRules(docs, nowMs) {
  const out = [];
  for (const d of docs) {
    if (d.kind !== 'bulletin' || !d.relevant || nowMs - docTime(d) > 72 * H) continue;
    for (const f of extractFigures(`${d.title}. ${d.summary || ''}`)) {
      out.push({
        id: `figure|${d.id}|${f.kind}`, rule: 'figure_extracted', severity: 'info', t: d.publishedAt || d.firstSeen,
        subject: { type: 'figure', kind: f.kind, doc: d.id }, value: f.value, url: d.url,
        title: { en: `Figure in official text: ${f.value.toLocaleString('en')} (${f.kind}) — pending review`, zh: `官方文本中识别到数字：${f.value.toLocaleString('zh')}（${f.kind === 'tests' ? '检测' : '接触者'}），待人工核实` },
        detail: { en: `“…${f.snippet}…” — machine-extracted; not yet reflected in headline figures.`, zh: `“…${f.snippet}…”（机器提取，尚未计入顶部数字）` },
      });
    }
  }
  return out;
}

// ---------- Source health ----------
export function sourceRules(health) {
  const out = [];
  for (const src of SOURCES) {
    const h = health[src.id];
    if (!h || (h.consecutiveFailures || 0) < 3 || !['official', 'intl', 'market'].includes(src.sourceType)) continue;
    out.push({
      id: `source_down|${src.id}`, rule: 'source_down', severity: 'info', t: h.lastRun, persistent: true,
      subject: { type: 'source', source: src.id },
      title: { en: `${src.name.en} unreachable (${h.consecutiveFailures} attempts)`, zh: `${src.name.zh}无法访问（连续 ${h.consecutiveFailures} 次）` },
      detail: { en: h.lastError || 'Unknown error', zh: h.lastError || '未知错误' },
    });
  }
  return out;
}

export { isRelevant };

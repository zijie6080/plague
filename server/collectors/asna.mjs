// ASNA (one of Russia's largest pharmacy networks) renders search results with
// Next.js; the embedded __NEXT_DATA__ JSON carries price and an availability count
// per product. Regional subdomains give city-specific prices and stock.
import { fetchResource, sleep } from '../lib/http.mjs';
import { DRUGS, citiesOf, TOPICAL } from '../config/drugs.mjs';

export function extractOffers(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  const data = JSON.parse(m[1]);
  const out = [];
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') {
      if ('available_count' in o && o.price && typeof o.price === 'object' && 'price' in o.price && o.name) {
        out.push({
          sku: String(o.id),
          name: o.name,
          price: Number(o.price.price) || null,
          oldPrice: Number(o.price.old) || null,
          preorder: !!o.price.preorder,
          available: Number(o.available_count) || 0,
          rx: !!o.recipe,
        });
        return;
      }
      for (const v of Object.values(o)) walk(v);
    }
  };
  walk(data);
  return out;
}

/** Pack size from a Russian product name: "20 шт", "N10", "№10". */
export function packSize(name) {
  const m = name.match(/(\d{1,4})\s*(шт|таб|капс|амп|фл|пак)/i) || name.match(/[N№]\s?(\d{1,4})\b/);
  const n = m ? Number(m[1]) : NaN;
  return n > 0 && n < 2000 ? n : null;
}

export function summarise(offers) {
  const priced = offers.filter((o) => o.price > 0);
  const unit = priced.map((o) => (packSize(o.name) ? o.price / packSize(o.name) : null)).filter((x) => x != null).sort((a, b) => a - b);
  const med = (a) => (a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null);
  return {
    skus: offers.length,
    inStock: offers.filter((o) => o.available > 0 && !o.preorder).length,
    preorder: offers.filter((o) => o.preorder).length,
    avail: offers.reduce((s, o) => s + o.available, 0),
    medianUnit: med(unit),
    minPrice: priced.length ? Math.min(...priced.map((o) => o.price)) : null,
    medianPrice: med(priced.map((o) => o.price).sort((a, b) => a - b)),
  };
}

export async function run(source, { delayMs = 2500 } = {}) {
  const results = [];
  const errors = [];
  let ms = 0;
  let lastStatus = 0;
  const CITIES = citiesOf('asna');
  for (const city of CITIES) {
    for (const drug of DRUGS) {
      const url = `https://${city.host}/search/?query=${encodeURIComponent(drug.query)}`;
      const res = await fetchResource(url, { timeout: 30000 });
      ms += res.ms;
      lastStatus = res.status;
      if (!res.ok) {
        errors.push(`${city.id}/${drug.id}: ${res.error || 'HTTP ' + res.status}`);
      } else {
        try {
          const offers = extractOffers(res.body);
          if (offers == null) throw new Error('no __NEXT_DATA__');
          const relevant = offers.filter((o) => drug.match.test(o.name) && (drug.perUnit || !TOPICAL.test(o.name)));
          results.push({ city: city.id, drug: drug.id, url, offers: relevant, summary: summarise(relevant) });
        } catch (err) {
          errors.push(`${city.id}/${drug.id}: ${err.message}`);
        }
      }
      await sleep(delayMs);
    }
  }
  const expected = CITIES.length * DRUGS.length;
  return {
    ok: results.length > expected / 2,
    degraded: errors.length > 0,
    status: lastStatus,
    ms: Math.round(ms / Math.max(1, expected)),
    pharma: results,
    error: errors.length ? `${errors.length}/${expected} queries failed: ${errors.slice(0, 3).join('; ')}` : undefined,
  };
}

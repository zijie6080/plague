// tabletka.by aggregates stock and prices across pharmacies in Belarus. Search
// results are server-rendered: one row per product with a price range and the
// number of pharmacies that have it in stock.
import { fetchResource, sleep } from '../lib/http.mjs';
import { decodeEntities } from '../lib/text.mjs';
import { DRUGS, citiesOf, TOPICAL } from '../config/drugs.mjs';
import { summarise } from './asna.mjs';

const clean = (s) => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

export function parseTabletka(html) {
  const out = new Map();
  for (const row of html.split('<tr class="tr-border">').slice(1)) {
    const id = row.match(/itemid="(\d+)"/)?.[1];
    const name = row.match(/<td class="name[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1];
    const form = row.match(/<td class="form[\s\S]*?tooltip-info-header">\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1];
    const price = row.match(/price-value">([^<]*)</)?.[1] || '';
    const count = row.match(/в\s*(\d+)\s*апт/)?.[1];
    if (!id || !name || out.has(id)) continue;
    const nums = [...price.matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) => Number(m[1].replace(',', '.')));
    const rx = /рецепт/i.test(row) && !/без рецепта/i.test(row);
    out.set(id, {
      sku: id,
      name: `${clean(name)} ${form ? clean(form) : ''}`.trim(),
      price: nums.length ? nums[0] : null,
      priceMax: nums.length > 1 ? nums[nums.length - 1] : null,
      preorder: false,
      available: count ? Number(count) : 0,
      rx,
    });
  }
  return [...out.values()];
}

export async function run(source, { delayMs = 2500 } = {}) {
  const results = [];
  const errors = [];
  let ms = 0;
  let lastStatus = 0;
  const cities = citiesOf('tabletka');
  for (const city of cities) {
    for (const drug of DRUGS.filter((d) => !d.perUnit)) {
      const url = `https://tabletka.by/search/?request=${encodeURIComponent(drug.query.split(' ')[0])}`;
      const res = await fetchResource(url, { timeout: 30000 });
      ms += res.ms;
      lastStatus = res.status;
      if (!res.ok) errors.push(`${drug.id}: ${res.error || 'HTTP ' + res.status}`);
      else {
        const offers = parseTabletka(res.body).filter((o) => drug.match.test(o.name) && (drug.perUnit || !TOPICAL.test(o.name)));
        results.push({ city: city.id, drug: drug.id, url, offers, summary: summarise(offers) });
      }
      await sleep(delayMs);
    }
  }
  const expected = cities.length * DRUGS.filter((d) => !d.perUnit).length;
  return {
    ok: results.length > expected / 2,
    degraded: errors.length > 0,
    status: lastStatus,
    ms: Math.round(ms / Math.max(1, expected)),
    pharma: results,
    error: errors.length ? `${errors.length}/${expected} queries failed: ${errors.slice(0, 3).join('; ')}` : undefined,
  };
}

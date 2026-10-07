// Builds simplified GeoJSON for the map from Natural Earth (public domain).
// Usage: node scripts/build-geo.mjs <ne_10m_admin_1.geojson> <ne_50m_admin_0.geojson>
import fs from 'node:fs/promises';
import mapshaper from 'mapshaper';

const [admin1Path, admin0Path] = process.argv.slice(2);
if (!admin1Path || !admin0Path) {
  console.error('usage: node scripts/build-geo.mjs <admin1.geojson> <admin0.geojson>');
  process.exit(1);
}

const NAME_FIX = {
  'RU-IRK': { zh: '伊尔库茨克州', en: 'Irkutsk Oblast' },
  'RU-ALT': { zh: '阿尔泰边疆区', en: 'Altai Krai' },
  'RU-AL': { zh: '阿尔泰共和国', en: 'Altai Republic' },
  'RU-BU': { zh: '布里亚特共和国', en: 'Republic of Buryatia' },
  'RU-ZAB': { zh: '外贝加尔边疆区', en: 'Zabaykalsky Krai' },
  'RU-KYA': { zh: '克拉斯诺亚尔斯克边疆区', en: 'Krasnoyarsk Krai' },
  'RU-TY': { zh: '图瓦共和国', en: 'Tuva Republic' },
  'RU-SA': { zh: '萨哈（雅库特）共和国', en: 'Sakha (Yakutia)' },
  'RU-MOW': { zh: '莫斯科', en: 'Moscow' },
};

const a1 = JSON.parse(await fs.readFile(admin1Path, 'utf8'));
const ru = a1.features
  .filter((f) => f.properties.adm0_a3 === 'RUS' && !String(f.properties.iso_3166_2).startsWith('UA-'))
  .map((f) => {
    const p = f.properties;
    const fix = NAME_FIX[p.iso_3166_2] || {};
    return {
      type: 'Feature',
      geometry: f.geometry,
      properties: { id: p.iso_3166_2, en: fix.en || p.name_en || p.name, zh: fix.zh || p.name_zh || p.name_en, ru: p.name_ru },
    };
  });

const NEIGHBORS = ['KAZ', 'MNG', 'CHN', 'KGZ', 'UZB', 'TJK', 'TKM', 'FIN', 'EST', 'LVA', 'LTU', 'BLR', 'UKR', 'GEO', 'AZE', 'PRK', 'JPN', 'NOR', 'POL', 'ARM'];
const ZH = { KAZ: '哈萨克斯坦', MNG: '蒙古', CHN: '中国', KGZ: '吉尔吉斯斯坦', UZB: '乌兹别克斯坦', TJK: '塔吉克斯坦', TKM: '土库曼斯坦' };
const a0 = JSON.parse(await fs.readFile(admin0Path, 'utf8'));
const nb = a0.features
  .filter((f) => NEIGHBORS.includes(f.properties.ADM0_A3))
  .map((f) => ({
    type: 'Feature',
    geometry: f.geometry,
    properties: { id: f.properties.ADM0_A3, en: f.properties.NAME_EN, zh: ZH[f.properties.ADM0_A3] || f.properties.NAME_ZH },
  }));

async function simplify(fc, pct) {
  const out = await mapshaper.applyCommands(
    `-i in.json -simplify ${pct}% keep-shapes -o out.json precision=0.001 format=geojson`,
    { 'in.json': JSON.stringify(fc) },
  );
  return out['out.json'].toString();
}

await fs.writeFile('public/geo/russia-regions.json', await simplify({ type: 'FeatureCollection', features: ru }, 4));
await fs.writeFile('public/geo/neighbors.json', await simplify({ type: 'FeatureCollection', features: nb }, 8));
for (const f of ['russia-regions.json', 'neighbors.json']) {
  const s = await fs.stat(`public/geo/${f}`);
  console.log(f, (s.size / 1024).toFixed(0), 'KB');
}

// Drugs tracked for price & availability. `match` filters search results to the
// active ingredient (search engines return loosely related products).
// Role:
//   first-line  — named in WHO/RF plague treatment & prophylaxis guidance
//   panic       — broad-spectrum antibiotics people buy "just in case"
//   control     — not plague-related; separates event effects from general drift
// Topical and eye/ear forms are irrelevant to plague treatment and would pollute
// the price signal (e.g. ciprofloxacin eye drops); they are excluded for antibiotics.
export const TOPICAL = /капл|мазь|гель|крем|линимент|суппоз|спрей|наружн|глазн|ушн|вагин/i;

export const DRUGS = [
  { id: 'doxycycline', query: 'доксициклин', match: /доксициклин|юнидокс|вибрамицин/i, role: 'first-line',
    name: { en: 'Doxycycline', zh: '多西环素', ru: 'Доксициклин' } },
  { id: 'ciprofloxacin', query: 'ципрофлоксацин', match: /ципро|цифран|ципролет|ципринол/i, role: 'first-line',
    name: { en: 'Ciprofloxacin', zh: '环丙沙星', ru: 'Ципрофлоксацин' } },
  { id: 'levofloxacin', query: 'левофлоксацин', match: /левофлоксацин|таваник|леволет|глево|флорацид/i, role: 'first-line',
    name: { en: 'Levofloxacin', zh: '左氧氟沙星', ru: 'Левофлоксацин' } },
  { id: 'gentamicin', query: 'гентамицин', match: /гентамицин/i, role: 'first-line',
    name: { en: 'Gentamicin', zh: '庆大霉素', ru: 'Гентамицин' } },
  { id: 'streptomycin', query: 'стрептомицин', match: /стрептомицин/i, role: 'first-line',
    name: { en: 'Streptomycin', zh: '链霉素', ru: 'Стрептомицин' } },
  { id: 'azithromycin', query: 'азитромицин', match: /азитро|сумамед|зитролид|хемомицин/i, role: 'panic',
    name: { en: 'Azithromycin', zh: '阿奇霉素', ru: 'Азитромицин' } },
  { id: 'amoxiclav', query: 'амоксициллин клавулановая', match: /амоксиклав|аугментин|флемоклав|амоксициллин.*клавул|экоклав/i, role: 'panic',
    name: { en: 'Amoxicillin/clavulanate', zh: '阿莫西林克拉维酸', ru: 'Амоксициллин + клавуланат' } },
  { id: 'masks', query: 'маска медицинская', match: /маск/i, role: 'panic', perUnit: 'piece',
    name: { en: 'Medical masks', zh: '医用口罩', ru: 'Маски медицинские' } },
  { id: 'paracetamol', query: 'парацетамол', match: /парацетамол/i, role: 'control',
    name: { en: 'Paracetamol (control)', zh: '对乙酰氨基酚（对照）', ru: 'Парацетамол' } },
];

// Markets are grouped by country because prices, packs, prescription rules and
// public reaction differ by country. Each country names the collector that reads
// its pharmacy data and, where it exists, a control market inside that country.
//
// Not covered, deliberately: China (药房网 renders prices through an obfuscated
// font) and Kazakhstan (i-teka.kz sits behind a Cloudflare bot challenge). Both are
// anti-scraping measures, which this project does not circumvent.
export const COUNTRIES = [
  { id: 'ru', source: 'asna', currency: 'RUB', symbol: '₽', availMetric: 'inStock',
    name: { en: 'Russia', zh: '俄罗斯', ru: 'Россия' },
    sourceName: { en: 'ASNA pharmacy network', zh: 'ASNA 连锁药房' },
    note: { en: 'Event region (Irkutsk, Shelekhov) against Moscow as the control market.', zh: '事发地区（伊尔库茨克、舍列霍夫）与对照市场莫斯科对比。' } },
  { id: 'by', source: 'tabletka', currency: 'BYN', symbol: 'Br', availMetric: 'avail',
    name: { en: 'Belarus', zh: '白俄罗斯', ru: 'Беларусь' },
    sourceName: { en: 'tabletka.by (all pharmacies in Belarus)', zh: 'tabletka.by（白俄罗斯全国药店）' },
    note: { en: 'Neighbouring country with open borders to Russia. Availability = number of pharmacies stocking the product.', zh: '与俄罗斯边境开放的邻国。可购量 = 有货药店的数量。' } },
];

// Moscow is the Russian control market: a rise there too means national drift,
// not an Irkutsk-specific shock.
export const CITIES = [
  { id: 'irkutsk', country: 'ru', host: 'irkutsk.asna.ru', name: { en: 'Irkutsk', zh: '伊尔库茨克', ru: 'Иркутск' }, role: 'epicenter' },
  { id: 'shelekhov', country: 'ru', host: 'shelekhov.asna.ru', name: { en: 'Shelekhov', zh: '舍列霍夫', ru: 'Шелехов' }, role: 'epicenter' },
  { id: 'moscow', country: 'ru', host: 'www.asna.ru', name: { en: 'Moscow', zh: '莫斯科', ru: 'Москва' }, role: 'control' },
  { id: 'belarus', country: 'by', name: { en: 'Belarus (national)', zh: '白俄罗斯全国', ru: 'Беларусь' }, role: 'national' },
];

export const citiesOf = (source) => {
  const countries = COUNTRIES.filter((c) => c.source === source).map((c) => c.id);
  return CITIES.filter((c) => countries.includes(c.country));
};
export const controlFor = (cityId) => {
  const city = CITIES.find((c) => c.id === cityId);
  return CITIES.find((c) => c.country === city?.country && c.role === 'control' && c.id !== cityId)?.id || null;
};

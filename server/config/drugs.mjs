// Drugs tracked for price & availability. `match` filters search results to the
// active ingredient (search engines return loosely related products).
// Role:
//   first-line  — named in WHO/RF plague treatment & prophylaxis guidance
//   panic       — broad-spectrum antibiotics people buy "just in case"
//   control     — not plague-related; separates event effects from general drift
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

// Cities. Moscow is the control market: a rise there too means national drift,
// not an Irkutsk-specific shock.
export const CITIES = [
  { id: 'irkutsk', host: 'irkutsk.asna.ru', name: { en: 'Irkutsk', zh: '伊尔库茨克', ru: 'Иркутск' }, role: 'epicenter' },
  { id: 'shelekhov', host: 'shelekhov.asna.ru', name: { en: 'Shelekhov', zh: '舍列霍夫', ru: 'Шелехов' }, role: 'epicenter' },
  { id: 'moscow', host: 'www.asna.ru', name: { en: 'Moscow (control)', zh: '莫斯科（对照）', ru: 'Москва' }, role: 'control' },
];

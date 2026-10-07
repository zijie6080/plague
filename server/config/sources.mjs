// Every automated source the monitor polls. `kind` selects the collector.
// `every` is the minimum interval between runs, in minutes. Keep pharmacy polling
// slow and polite: it hits commercial sites, not feeds.

const gnews = (q, hl, gl, ceid) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

// Items published before this are ignored (keeps archive pages out of feeds).
export const EVENT_SINCE = '2026-09-20T00:00:00Z';

// Words that make an item from a general-purpose feed relevant to this event.
export const RELEVANCE = [
  /чум/i, /противочум/i, /yersinia/i, /plague/i, /鼠疫/, /шелехов/i, /shelekhov/i,
  /иркутск[а-я]*.{0,60}(пневмони|карантин|инфекц|изоляц)/i,
  /irkutsk.{0,60}(pneumonia|quarantin|infection|isolat)/i,
  /伊尔库茨克/, /伊爾庫茨克/,
];

export const SOURCES = [
  // ---- Official channels (scraped, change-detected) ----
  {
    id: 'rpn-telegram', kind: 'telegram', channel: 'rospotrebnadzor_ru', every: 10,
    name: { en: 'Rospotrebnadzor · Telegram', zh: '俄罗斯联邦消费者权益保护和公益监督局 · Telegram' },
    org: 'rospotrebnadzor', sourceType: 'official', country: 'RU', relevanceFilter: true,
    homepage: 'https://t.me/s/rospotrebnadzor_ru',
  },
  {
    id: 'rpn-site', kind: 'page', every: 30,
    url: 'https://www.rospotrebnadzor.ru/about/info/news/',
    name: { en: 'Rospotrebnadzor · press releases', zh: '俄消费者权益保护局 · 新闻发布' },
    org: 'rospotrebnadzor', sourceType: 'official', country: 'RU',
    linkPattern: /\/about\/info\/news\/news_details\.php\?ELEMENT_ID=\d+/, relevanceFilter: true,
    note: { en: 'Often geo-blocked outside Russia.', zh: '在俄罗斯境外经常无法访问。' },
  },
  {
    id: 'rpn-38', kind: 'page', every: 30,
    url: 'https://38.rospotrebnadzor.ru/news',
    name: { en: 'Rospotrebnadzor · Irkutsk Oblast office', zh: '俄消费者权益保护局 · 伊尔库茨克州分局' },
    org: 'rospotrebnadzor-38', sourceType: 'official', country: 'RU', relevanceFilter: false,
    note: { en: 'Regional office; often geo-blocked outside Russia.', zh: '地区分局；境外常无法访问。' },
  },
  {
    id: 'irkobl', kind: 'page', every: 30,
    url: 'https://irkobl.ru/sites/minzdrav/news/',
    name: { en: 'Irkutsk Oblast Ministry of Health', zh: '伊尔库茨克州卫生部' },
    org: 'irkobl', sourceType: 'official', country: 'RU', relevanceFilter: false,
    note: { en: 'Regional government site; often geo-blocked outside Russia.', zh: '州政府网站；境外常无法访问。' },
  },
  {
    id: 'us-embassy', kind: 'rss', every: 30,
    url: 'https://ru.usembassy.gov/feed/',
    name: { en: 'U.S. Embassy Moscow', zh: '美国驻俄罗斯大使馆' },
    org: 'us-embassy', sourceType: 'official', country: 'US', relevanceFilter: true, bulletin: true,
  },
  {
    id: 'who-news', kind: 'rss', every: 30,
    url: 'https://www.who.int/rss-feeds/news-english.xml',
    name: { en: 'WHO · News', zh: '世界卫生组织 · 新闻' },
    org: 'who', sourceType: 'intl', country: 'INT', relevanceFilter: true, bulletin: true,
  },
  {
    id: 'who-don', kind: 'page', every: 60,
    url: 'https://www.who.int/emergencies/disease-outbreak-news',
    name: { en: 'WHO · Disease Outbreak News', zh: '世界卫生组织 · 疾病暴发新闻' },
    org: 'who', sourceType: 'intl', country: 'INT',
    linkPattern: /\/emergencies\/disease-outbreak-news\/item\/[\w-]+/, relevanceFilter: true, bulletin: true,
  },
  {
    id: 'un-news', kind: 'rss', every: 30,
    url: 'https://news.un.org/feed/subscribe/en/news/topic/health/feed/rss.xml',
    name: { en: 'UN News · Health', zh: '联合国新闻 · 卫生' },
    org: 'un', sourceType: 'intl', country: 'INT', relevanceFilter: true,
  },
  {
    id: 'ecdc', kind: 'rss', every: 60,
    url: 'https://www.ecdc.europa.eu/en/taxonomy/term/1307/feed',
    name: { en: 'ECDC · Threats reports', zh: '欧洲疾控中心 · 威胁报告' },
    org: 'ecdc', sourceType: 'intl', country: 'EU', relevanceFilter: true, bulletin: true,
  },
  {
    id: 'who-pdf', kind: 'pdf', every: 180, optional: true,
    urls: [],
    name: { en: 'Official PDF documents', zh: '官方 PDF 文件' },
    org: 'who', sourceType: 'intl', country: 'INT',
    note: { en: 'Add PDF URLs (WHO DON PDFs, Rospotrebnadzor orders) to urls[] to track them.', zh: '在 urls[] 中加入 PDF 链接（如 WHO DON、俄消费者权益保护局文件）即可追踪。' },
  },

  // ---- News aggregation ----
  { id: 'gnews-en', kind: 'rss', every: 10, url: gnews('Irkutsk plague OR "anti-plague institute" OR Shelekhov pneumonia when:7d', 'en-US', 'US', 'US:en'),
    name: { en: 'Google News · English', zh: 'Google 新闻 · 英文' }, sourceType: 'aggregator', relevanceFilter: true, aggregator: true },
  { id: 'gnews-ru', kind: 'rss', every: 10, url: gnews('чума Иркутск OR противочумный OR Шелехов пневмония when:7d', 'ru', 'RU', 'RU:ru'),
    name: { en: 'Google News · Russian', zh: 'Google 新闻 · 俄文' }, sourceType: 'aggregator', relevanceFilter: true, aggregator: true },
  { id: 'gnews-zh', kind: 'rss', every: 15, url: gnews('伊尔库茨克 鼠疫 OR 俄罗斯 鼠疫 when:7d', 'zh-CN', 'CN', 'CN:zh-Hans'),
    name: { en: 'Google News · Chinese', zh: 'Google 新闻 · 中文' }, sourceType: 'aggregator', relevanceFilter: true, aggregator: true },
  // Indexes official Russian sites through Google News: keeps official statements
  // flowing when the sites themselves are geo-blocked from the collector's network.
  { id: 'gnews-official', kind: 'rss', every: 15, url: gnews('чума OR пневмония OR Иркутск site:rospotrebnadzor.ru', 'ru', 'RU', 'RU:ru'),
    name: { en: 'Google News · Russian official sites', zh: 'Google 新闻 · 俄官方网站' }, sourceType: 'aggregator', relevanceFilter: true, aggregator: true },
  { id: 'meduza', kind: 'rss', every: 15, url: 'https://meduza.io/rss/all',
    name: { en: 'Meduza', zh: 'Meduza' }, sourceType: 'media', relevanceFilter: true },
  { id: 'moscowtimes', kind: 'rss', every: 15, url: 'https://www.themoscowtimes.com/rss/news',
    name: { en: 'The Moscow Times', zh: '莫斯科时报' }, sourceType: 'media', relevanceFilter: true },
  { id: 'tass', kind: 'rss', every: 15, url: 'https://tass.ru/rss/v2.xml',
    name: { en: 'TASS', zh: '塔斯社' }, sourceType: 'state_media', relevanceFilter: true },
  { id: 'ria', kind: 'rss', every: 15, url: 'https://ria.ru/export/rss2/archive/index.xml',
    name: { en: 'RIA Novosti', zh: '俄新社' }, sourceType: 'state_media', relevanceFilter: true },
  { id: 'rbc', kind: 'rss', every: 15, url: 'https://rssexport.rbc.ru/rbcnews/news/30/full.rss',
    name: { en: 'RBC', zh: 'RBC 俄罗斯商业咨询' }, sourceType: 'media', relevanceFilter: true },

  // ---- Pharmacy prices & availability ----
  {
    id: 'asna', kind: 'asna', every: 180,
    name: { en: 'ASNA pharmacy network', zh: 'ASNA 连锁药房网络' },
    sourceType: 'market',
    homepage: 'https://irkutsk.asna.ru/',
  },
];

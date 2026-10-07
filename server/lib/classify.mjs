import { DOMAIN_TYPES, SOURCE_TYPE_TIER } from '../config/domains.mjs';
import { RELEVANCE } from '../config/sources.mjs';

const index = [];
for (const [type, domains] of Object.entries(DOMAIN_TYPES)) for (const d of domains) index.push([d, type]);
index.sort((a, b) => b[0].length - a[0].length);

export function classifyDomain(host) {
  if (!host) return 'media';
  for (const [d, type] of index) if (host === d || host.endsWith('.' + d)) return type;
  return 'media';
}

export const tierForType = (type) => SOURCE_TYPE_TIER[type] || 'reported';

export const isRelevant = (text) => RELEVANCE.some((re) => re.test(text));

// Lightweight topic tags so the UI can filter news by what it is about.
const TOPICS = [
  ['second-case', /второ[йг][оа]?\s+(случа|сотрудни|заболев|смерт|пациент)|second (case|death|employee|patient)|第二(例|名)/i],
  ['who', /\bвоз\b|\bwho\b|world health|世卫|世界卫生/i],
  ['diplomacy', /госдеп|state department|démarche|demarche|трамп|trump|путин|putin|рубио|rubio|посольств|embassy|песков|peskov|kremlin|кремл|特朗普|普京|大使馆/i],
  ['quarantine', /карантин|изоляц|наблюдени|quarantin|isolat|observation|隔离|观察/i],
  ['pharmacy', /аптек|антибиотик|лекарств|pharmac|antibiotic|drug|药|抗生素/i],
  ['lab', /лаборатор|пробирк|институт|lab|test tube|institute|实验室|研究所/i],
  ['border', /границ|border|санитарн[а-я]+ контрол|казахстан|kazakhstan|узбекистан|uzbekistan|кыргыз|kyrgyz|монгол|mongolia|边境|哈萨克/i],
  ['denial', /опроверг|фейк|не подтверд|ложн|denies|denied|fake|false information|no plague|辟谣|否认/i],
];

export function topicTags(text) {
  return TOPICS.filter(([, re]) => re.test(text)).map(([t]) => t);
}

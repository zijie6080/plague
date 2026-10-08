export type Lang = 'zh' | 'en';
export type L10n = { zh: string; en: string; ru?: string; orig?: string };
export type Tier = 'confirmed' | 'suspected' | 'reported' | 'unverified' | 'disputed';
export type SourceType = 'official' | 'intl' | 'wire' | 'media' | 'state_media' | 'caution' | 'aggregator' | 'market';
export type Severity = 'info' | 'watch' | 'alert';

export interface Citation { publisher: string; title: string; url: string; date: string; sourceType: SourceType; lang: string; urlPrecision?: 'search' }

export interface Observation { t: string; value: number | null; tier: Tier; approx?: boolean; delta?: boolean; sources: string[]; note?: L10n | null; text?: L10n | null }
export interface Metric {
  id: string; label: L10n; definition: L10n;
  headline: { value: number; approx: boolean; t: string; tier: Tier } | null;
  tiers: Partial<Record<Tier, { value: number | null; approx: boolean; delta: boolean; t: string; text: L10n | null; note: L10n | null; sources: string[] }>>;
  history: Observation[];
  changed24h: boolean;
}

export interface TimelineEvent {
  id: string; t: string; precision: 'day' | 'time'; tier: Tier; category: string; importance: 1 | 2 | 3;
  locations: string[]; title: L10n; summary: L10n; sources: string[];
}

export interface MapLocation {
  id: string; type: string; tier: Tier; scale: 'local' | 'country'; precision: string; lat: number; lon: number;
  name: L10n; short?: L10n; status: L10n; events: string[];
}

export interface Bulletin {
  id: string; t: string; org: string | null; sourceType: SourceType; issuer: L10n; title: L10n; points: L10n[];
  sources: string[]; via?: boolean; auto?: boolean; url?: string; summary?: string; lang?: string;
}

export interface NewsRef { id: string; title: string; url: string; publisher: string; host: string; sourceType: SourceType; t: string; lang: string }
export interface NewsCluster extends NewsRef { topics: string[]; summary: string; firstSeen: string; also: NewsRef[] }

export interface PharmaPoint { t: string; index: number | null; medianUnit: number | null; minPrice: number | null; medianPrice: number | null; inStock: number; skus: number; avail: number; preorder: number }
export interface Offer { name: string; price: number | null; priceMax?: number | null; available: number; preorder: boolean; rx: boolean; firstPrice: number | null }
export interface Pharma {
  drugs: { id: string; name: L10n; role: 'first-line' | 'panic' | 'control' }[];
  countries: { id: string; name: L10n; currency: string; symbol: string; availMetric: 'inStock' | 'avail'; sourceName: L10n; note: L10n }[];
  cities: { id: string; country: string; name: L10n; role: 'epicenter' | 'control' | 'national' }[];
  since: string | null; lastAt: string | null; observations: number;
  series: Record<string, PharmaPoint[]>;
  latest: Record<string, { t: string; url: string; offers: Offer[] }>;
}

export interface Signal {
  id: string; rule: string; severity: Severity; t: string; title: L10n; detail: L10n; active: boolean;
  subject: Record<string, string>; value?: number; baseline?: number | null; firstSeen: string; lastSeen: string; url?: string; excerpt?: string[];
}

export interface SourceHealth {
  id: string; name: L10n; kind: string; sourceType: SourceType; every: number; note: L10n | null; url: string | null;
  status: 'ok' | 'degraded' | 'down' | 'pending' | 'idle';
  lastRun: string | null; lastOk: string | null; lastMs: number | null; lastError: string | null; items: number | null;
  failures: number; nextRun: string | null; runs: { t: string; ok: boolean; ms: number; n: number; fresh: number }[]; pageChangedAt: string | null;
}

export interface Daily {
  since: string;
  metricChanges: { metric: string; label: L10n; tier: Tier; from: number | null; to: number | null; text?: L10n }[];
  events: string[]; bulletins: string[]; anomalies: string[];
  news: { last24h: number; prev24h: number };
  pharma: { drug: string; city: string; indexFrom: number; indexTo: number; stockFrom: number; stockTo: number }[];
}

export interface State {
  schema: number; generatedAt: string; lastDataAt: string;
  event: { id: string; start: string; title: L10n; place: L10n };
  briefing: { updatedAt: string; headline: L10n; known: (L10n & { tier: Tier })[]; unknown: L10n[]; guidance: L10n[] };
  risk: { t: string; source: string; levels: { scope: L10n; level: string }[] };
  metrics: Metric[];
  events: TimelineEvent[];
  locations: MapLocation[];
  regions: { id: string; role: string; tier: Tier }[];
  countries: { id: string; role: string; tier: Tier }[];
  bulletins: Bulletin[];
  news: NewsCluster[];
  newsVolume: { t: string; total: number; official: number; media: number; caution: number }[];
  pharma: Pharma;
  anomalies: { active: Signal[]; recent: Signal[] };
  sources: SourceHealth[];
  daily: Daily;
  citations: Record<string, Citation>;
}

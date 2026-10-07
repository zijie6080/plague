import type { Lang } from '../types';
import { translate } from '../i18n';

const IRK_TZ = 'Asia/Irkutsk';

export function relTime(iso: string | null | undefined, lang: Lang, now = Date.now(), future = false) {
  if (!iso) return translate(lang, 'never');
  const diff = now - Date.parse(iso);
  // Past timestamps slightly ahead of the (coarse) clock are just "now", not "in 1 min".
  if (diff < 0 && !future) return translate(lang, 'justNow');
  if (diff < 0) {
    const m = Math.max(1, Math.round(-diff / 60000));
    return translate(lang, 'inMinutes', { n: m });
  }
  const m = Math.floor(diff / 60000);
  if (m < 1) return translate(lang, 'justNow');
  if (m < 60) return translate(lang, 'minutesAgo', { n: m });
  const h = Math.floor(m / 60);
  if (h < 48) return translate(lang, 'hoursAgo', { n: h });
  return translate(lang, 'daysAgo', { n: Math.floor(h / 24) });
}

const loc = (lang: Lang) => (lang === 'zh' ? 'zh-CN' : 'en-GB');

/** Event times are shown in Irkutsk time — the local reference for the event. */
export function fmtEventDate(iso: string, lang: Lang, precision: 'day' | 'time' = 'time') {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat(loc(lang), { timeZone: IRK_TZ, month: 'short', day: 'numeric' }).format(d);
  if (precision === 'day') return date;
  const time = new Intl.DateTimeFormat(loc(lang), { timeZone: IRK_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${date} ${time}`;
}

export function fmtDayKey(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IRK_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export function fmtDayHeading(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(loc(lang), { timeZone: IRK_TZ, weekday: 'short', month: 'long', day: 'numeric' }).format(new Date(iso));
}

/** System timestamps (collection runs) are shown in the reader's own time zone. */
export function fmtLocal(iso: string | null | undefined, lang: Lang, withDate = true) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(loc(lang), {
    ...(withDate ? { month: 'short', day: 'numeric' } : {}),
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

export function fmtNum(n: number | null | undefined, lang: Lang, digits = 0) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(loc(lang), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

export function fmtPct(delta: number, digits = 1) {
  const s = delta.toFixed(digits);
  return `${delta > 0 ? '+' : delta < 0 ? '' : '±'}${s}%`;
}

export function dayNumber(startIso: string, now = Date.now()) {
  return Math.floor((now - Date.parse(startIso + 'T00:00:00+08:00')) / 86_400_000) + 1;
}

export const hostLabel = (host: string) => host.replace(/^(www|m|amp)\./, '');

import { useI18n } from '../i18n';
import type { State } from '../types';
import { fmtEventDate, fmtNum, fmtPct } from '../lib/format';
import { SeverityBadge, TierBadge } from './ui/Badges';
import { Sk } from './ui/Misc';
import { useUI } from './ui-context';

/** "What changed since yesterday" — one list, ordered by weight, not by data type. */
export function SinceYesterday({ state }: { state: State | null }) {
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  if (!state) return <div className="rail-block"><h3>{t('sinceYesterday')}</h3><Sk h={160} /></div>;
  const d = state.daily;
  const events = d.events.map((id) => state.events.find((e) => e.id === id)!).filter(Boolean);
  const signals = d.anomalies.map((id) => state.anomalies.active.find((a) => a.id === id)!).filter((s) => s && s.severity !== 'info');
  const drug = (id: string) => state.pharma.drugs.find((x) => x.id === id)?.name;
  const city = (id: string) => state.pharma.cities.find((x) => x.id === id)?.name;
  const empty = !d.metricChanges.length && !events.length && !signals.length && !d.pharma.length;

  return (
    <div className="rail-block">
      <h3>{t('sinceYesterday')}</h3>
      {empty && <p className="muted small" style={{ margin: 0 }}>{t('noChanges')}</p>}
      <ul className="changes">
        {d.metricChanges.map((c, i) => (
          <li key={`m${i}`}>
            <button onClick={() => open({ kind: 'metric', id: c.metric })}>
              <div className="meta"><TierBadge tier={c.tier} noTip /></div>
              <div className="fig-line">
                <span className="t">{l(c.label)}</span>
                <b>{c.to != null ? <>{c.from != null && <span className="from">{fmtNum(c.from, lang)} → </span>}{c.from == null && (c.tier === 'unverified' || c.tier === 'suspected') ? '+' : ''}{fmtNum(c.to, lang)}</> : c.text ? l(c.text) : '—'}</b>
              </div>
            </button>
          </li>
        ))}
        {events.slice(0, 5).map((e) => (
          <li key={e.id}>
            <button onClick={() => open({ kind: 'event', id: e.id })}>
              <div className="meta"><span>{fmtEventDate(e.t, lang, e.precision)}</span><TierBadge tier={e.tier} noTip /></div>
              <span className="t" style={{ fontWeight: e.importance === 3 ? 600 : 400 }}>{l(e.title)}</span>
            </button>
          </li>
        ))}
        {signals.slice(0, 3).map((s) => (
          <li key={s.id}>
            <button onClick={() => open({ kind: 'signal', id: s.id })}>
              <div className="meta"><SeverityBadge sev={s.severity} /></div>
              <span className="t">{l(s.title)}</span>
            </button>
          </li>
        ))}
        {d.pharma.slice(0, 3).map((p, i) => (
          <li key={`p${i}`}>
            <a href="#pharma"><div className="fig-line"><span className="t">{l(drug(p.drug))} · {l(city(p.city))}</span><b>{fmtPct(p.indexTo - p.indexFrom)}</b></div></a>
          </li>
        ))}
        <li>
          <a href="#feed"><div className="fig-line"><span className="t muted">{t('coverage')}</span><b className="muted" style={{ fontSize: 14 }}>{t('coverageLine', { a: d.news.last24h, b: d.news.prev24h })}</b></div></a>
        </li>
      </ul>
    </div>
  );
}

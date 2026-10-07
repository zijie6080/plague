import { useI18n } from '../i18n';
import type { State } from '../types';
import { fmtEventDate, fmtNum, fmtPct } from '../lib/format';
import { Panel, Sk } from './ui/Misc';
import { SeverityBadge, TierBadge } from './ui/Badges';
import { Icon } from './ui/Icon';
import { useUI } from './ui-context';

export function SinceYesterday({ state }: { state: State | null }) {
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  if (!state) {
    return (
      <Panel eyebrow={<><Icon name="clock" size={13} />{t('sinceYesterday')}</>} title={t('sinceYesterdaySub')}>
        <div className="stack" style={{ gap: 10 }}>{Array.from({ length: 6 }, (_, i) => <Sk key={i} w={`${90 - i * 8}%`} />)}</div>
      </Panel>
    );
  }
  const d = state.daily;
  const events = d.events.map((id) => state.events.find((e) => e.id === id)!).filter(Boolean);
  const bulletins = d.bulletins.map((id) => state.bulletins.find((b) => b.id === id)!).filter(Boolean);
  const signals = d.anomalies.map((id) => state.anomalies.active.find((a) => a.id === id)!).filter(Boolean);
  const drug = (id: string) => state.pharma.drugs.find((x) => x.id === id)?.name;
  const city = (id: string) => state.pharma.cities.find((x) => x.id === id)?.name;
  const newsDelta = d.news.last24h - d.news.prev24h;
  const empty = !d.metricChanges.length && !events.length && !bulletins.length && !signals.length && !d.pharma.length;

  return (
    <Panel eyebrow={<><Icon name="clock" size={13} />{t('sinceYesterday')}</>} title={t('sinceYesterdaySub')}>
      {empty && <p className="muted" style={{ margin: 0 }}>{t('noChanges')}</p>}

      {d.metricChanges.length > 0 && (
        <div className="delta-sec">
          <div className="delta-label">{t('figures')}<span className="count">{d.metricChanges.length}</span></div>
          {d.metricChanges.map((c, i) => (
            <button className="delta-row" key={i} onClick={() => open({ kind: 'metric', id: c.metric })} style={{ width: '100%', textAlign: 'left' }}>
              <span className="name">{l(c.label)}</span>
              <TierBadge tier={c.tier} small noTip />
              <span className="val">
                {c.to != null ? (<>{c.from != null && <span className="from">{fmtNum(c.from, lang)} → </span>}{c.from == null && (c.tier === 'unverified' || c.tier === 'suspected') ? '+' : ''}{fmtNum(c.to, lang)}</>) : c.text ? <span style={{ fontFamily: 'var(--font)', fontWeight: 500 }}>{l(c.text)}</span> : '—'}
              </span>
            </button>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="delta-sec">
          <div className="delta-label">{t('newEvents')}<span className="count">{events.length}</span></div>
          {events.slice(0, 5).map((e) => (
            <button className="delta-item" key={e.id} onClick={() => open({ kind: 'event', id: e.id })}>
              <TierBadge tier={e.tier} small noTip />
              <span style={{ fontWeight: e.importance === 3 ? 600 : 450 }}>{l(e.title)}</span>
              <span className="when">{fmtEventDate(e.t, lang, e.precision)}</span>
            </button>
          ))}
        </div>
      )}

      {bulletins.length > 0 && (
        <div className="delta-sec">
          <div className="delta-label">{t('newBulletins')}<span className="count">{bulletins.length}</span></div>
          {bulletins.slice(0, 4).map((b) => (
            <a className="delta-item" key={b.id} href="#feed" onClick={() => sessionStorage.setItem('feedTab', 'official')}>
              <Icon name="shield" size={14} style={{ color: 'var(--t-confirmed)', marginTop: 2 }} />
              <span><span className="faint">{l(b.issuer)} · </span>{l(b.title)}</span>
            </a>
          ))}
        </div>
      )}

      {signals.length > 0 && (
        <div className="delta-sec">
          <div className="delta-label">{t('newSignals')}<span className="count">{signals.length}</span></div>
          {signals.slice(0, 4).map((s) => (
            <button className="delta-item" key={s.id} onClick={() => open({ kind: 'signal', id: s.id })}>
              <SeverityBadge sev={s.severity} />
              <span>{l(s.title)}</span>
            </button>
          ))}
        </div>
      )}

      {d.pharma.length > 0 && (
        <div className="delta-sec">
          <div className="delta-label">{t('pharmaMoves')}</div>
          {d.pharma.map((p, i) => (
            <div className="delta-row" key={i}>
              <span className="name">{l(drug(p.drug))} · <span className="faint">{l(city(p.city))}</span></span>
              <span className="val" style={{ color: p.indexTo > p.indexFrom ? 'var(--s-alert)' : undefined }}>{fmtPct(p.indexTo - p.indexFrom)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="delta-sec">
        <div className="delta-label">{t('coverage')}</div>
        <div className="delta-row">
          <span className="name muted">{t('coverageLine', { a: d.news.last24h, b: d.news.prev24h })}</span>
          <span className="val" style={{ color: 'var(--text-2)' }}>{newsDelta > 0 ? '+' : ''}{newsDelta}</span>
        </div>
      </div>
    </Panel>
  );
}

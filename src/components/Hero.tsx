import { useI18n } from '../i18n';
import type { Metric, State } from '../types';
import { dayNumber, fmtEventDate, fmtNum, relTime } from '../lib/format';
import { Sk } from './ui/Misc';
import { TierMark } from './ui/Badges';
import { useUI } from './ui-context';
import { valueAsOf } from './Replay';

const HERO_METRICS = ['lab_confirmed', 'deaths', 'observation', 'tests'];
const RISK_STEPS = ['very-low', 'low', 'moderate-low', 'moderate', 'high'];

function Figure({ m, now }: { m: Metric; now: number }) {
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  const v = valueAsOf(m, now);
  const yday = valueAsOf(m, now - 86_400_000);
  const delta = v && yday && v.value != null && yday.value != null ? v.value - yday.value : null;
  const peak = m.history.filter((h) => h.value != null && !h.delta).reduce((a, h) => Math.max(a, h.value!), 0);
  const side = m.history.filter((h) => h.delta || (h.tier !== 'confirmed' && h.tier !== v?.tier)).at(-1);
  return (
    <button className="hfig" onClick={() => open({ kind: 'metric', id: m.id })}>
      <span className="hfig-label">{l(m.label)}</span>
      <span className="hfig-value">{v ? <>{v.approx && <small>~</small>}{fmtNum(v.value!, lang)}</> : '—'}</span>
      <span className="hfig-sub">
        {v && v.tier !== 'confirmed' ? <TierMark tier={v.tier} withLabel /> : <TierMark tier="confirmed" withLabel />}
        {delta != null && delta !== 0 && <span className={`delta${delta > 0 && m.id !== 'tests' ? ' up' : ''}`}>{delta > 0 ? '+' : ''}{fmtNum(delta, lang)} {t('vsYesterday')}</span>}
        {m.id === 'observation' && peak > 0 && v?.value === 0 && <span className="faint">{t('peakWas', { n: fmtNum(peak, lang) })}</span>}
      </span>
      {side && side.tier !== 'confirmed' && side.note && <span className="hfig-note"><TierMark tier={side.tier} /> {l(side.note)}</span>}
    </button>
  );
}

export function Hero({ state, now }: { state: State | null; now: number }) {
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  if (!state) return <div className="hero"><Sk w={200} h={28} /><Sk h={44} style={{ marginTop: 18, maxWidth: 820 }} /><Sk h={110} style={{ marginTop: 28 }} /></div>;
  const b = state.briefing;
  const metrics = HERO_METRICS.map((id) => state.metrics.find((m) => m.id === id)).filter(Boolean) as Metric[];
  const latest = [...state.events].filter((e) => e.importance >= 2).sort((a, c) => Date.parse(c.t) - Date.parse(a.t)).slice(0, 4);
  return (
    <div className="hero">
      <div className="hero-main">
        <div className="status" data-level={b.status?.level || 'low'}>
          <span className="status-chip">{l(b.status)}</span>
          <span className="faint">{t('dayN', { n: dayNumber(state.event.start, now) })} · {l(state.event.place)} · {t('editorialAsOf')} {relTime(b.updatedAt, lang, now)}</span>
        </div>
        <h1>{l(b.headline)}</h1>
        {b.dek && <p className="dek">{l(b.dek)}</p>}
        <div className="hfigs">{metrics.map((m) => <Figure key={m.id} m={m} now={now} />)}</div>
        <div className="hero-guide">
          <h3>{t('guidance')}</h3>
          <ul>{b.guidance.map((g, i) => <li key={i}>{l(g)}</li>)}</ul>
        </div>
      </div>
      <aside className="hero-side">
        <div className="side-block">
          <h3>{t('latestDev')}</h3>
          <ol className="latest">
            {latest.map((e) => (
              <li key={e.id}>
                <button onClick={() => open({ kind: 'event', id: e.id })}>
                  <span className="when">{fmtEventDate(e.t, lang, 'day')} <TierMark tier={e.tier} /></span>
                  <span className="what">{l(e.title)}</span>
                </button>
              </li>
            ))}
          </ol>
          <a className="more" href="#timeline">{t('seeReplay')} →</a>
        </div>
        <div className="side-block">
          <h3>{t('whoRisk')}</h3>
          <div className="riskbars">
            {state.risk.levels.map((r) => {
              const i = RISK_STEPS.indexOf(r.level);
              return (
                <div key={r.scope.en} className="riskrow">
                  <span>{l(r.scope)}</span>
                  <span className="bar" aria-hidden="true">{RISK_STEPS.map((s, k) => <i key={s} className={k <= i ? 'on' : ''} data-lvl={i} />)}</span>
                  <b>{t(`risk_${r.level}`)}</b>
                </div>
              );
            })}
          </div>
          {state.risk.note && <p className="faint small" style={{ margin: '8px 0 0' }}>{l(state.risk.note)}</p>}
        </div>
      </aside>
    </div>
  );
}


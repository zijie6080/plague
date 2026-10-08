import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import type { Metric, State, Tier } from '../types';
import { dayNumber, fmtEventDate, fmtNum } from '../lib/format';
import { TierBadge } from './ui/Badges';
import { AnimatedNumber, Sk } from './ui/Misc';
import { useUI } from './ui-context';

const OTHER_TIERS: Tier[] = ['suspected', 'reported', 'unverified', 'disputed'];

function Figure({ m }: { m: Metric }) {
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  const ref = useRef<HTMLButtonElement>(null);
  const prev = useRef('');
  const sig = JSON.stringify(m.tiers);
  useEffect(() => {
    if (prev.current && prev.current !== sig && ref.current) {
      ref.current.classList.remove('flash'); void ref.current.offsetWidth; ref.current.classList.add('flash');
    }
    prev.current = sig;
  }, [sig]);
  const conf = m.tiers.confirmed;
  return (
    <button className="fig" ref={ref} onClick={() => open({ kind: 'metric', id: m.id })}>
      {m.changed24h && <span className="fresh" title={t('changed24h')} />}
      <span className="fig-label">{l(m.label)}</span>
      {m.headline ? (
        <span className="fig-value">{m.headline.approx && <span className="approx">~</span>}<AnimatedNumber value={m.headline.value} format={(n) => fmtNum(n, lang)} /></span>
      ) : conf?.text ? (
        <span className="fig-value text">{l(conf.text)}</span>
      ) : (
        <span className="fig-value none">{t('noOfficialFigure')}</span>
      )}
      {(m.headline || conf?.text) && <span className="fig-tier"><TierBadge tier="confirmed" noTip /></span>}
      {OTHER_TIERS.some((tier) => m.tiers[tier]) && (
        <span className="fig-more">
          {OTHER_TIERS.filter((tier) => m.tiers[tier]).map((tier) => {
            const o = m.tiers[tier]!;
            return (
              <span className="row" key={tier}>
                {o.value != null && <b>{o.delta ? '+' : ''}{o.approx ? '~' : ''}{fmtNum(o.value, lang)}</b>}
                <TierBadge tier={tier} noTip />
              </span>
            );
          })}
        </span>
      )}
    </button>
  );
}

export function Lead({ state, now }: { state: State | null; now: number }) {
  const { t, l, lang } = useI18n();
  if (!state) {
    return (
      <div className="lead" aria-busy="true">
        <Sk w={260} h={14} />
        <Sk h={40} style={{ marginTop: 16, maxWidth: 760 }} /><Sk h={40} w="60%" style={{ marginTop: 8 }} />
        <Sk h={120} style={{ marginTop: 30 }} />
      </div>
    );
  }
  const b = state.briefing;
  return (
    <div className="lead">
      <div className="kicker">
        <strong>{t('dayN', { n: dayNumber(state.event.start, now) })}</strong>
        <span>{l(state.event.place)}</span>
        <span>{t('editorialAsOf')} {fmtEventDate(b.updatedAt, lang)} {t('irkutskTime')}</span>
      </div>
      <h1>{l(b.headline)}</h1>
      <p className="dek">{l(state.event.title)} · {t('sinceStart', { d: fmtEventDate(state.event.start + 'T12:00:00+08:00', lang, 'day') })}</p>
      <div className="figures">{state.metrics.map((m) => <Figure key={m.id} m={m} />)}</div>
      <p className="figures-note">{t('keyFiguresNote')}</p>
    </div>
  );
}

const RISK_STEPS = ['very-low', 'low', 'moderate-low', 'moderate', 'high'];
const riskColor = (lvl: string) => (RISK_STEPS.indexOf(lvl) <= 1 ? 'var(--t-confirmed)' : RISK_STEPS.indexOf(lvl) <= 2 ? 'var(--t-suspected)' : 'var(--s-alert)');

export function RiskBlock({ state }: { state: State }) {
  const { t, l } = useI18n();
  const src = state.citations[state.risk.source];
  return (
    <div className="rail-block">
      <h3>{t('whoRisk')}</h3>
      <table className="risk"><tbody>
        {state.risk.levels.map((r) => {
          const idx = RISK_STEPS.indexOf(r.level);
          return (
            <tr key={r.scope.en}>
              <td>{l(r.scope)}</td>
              <td>{t(`risk_${r.level}`)}<span className="scale" style={{ ['--c' as string]: riskColor(r.level) }} aria-hidden="true">{RISK_STEPS.map((s, i) => <i key={s} className={i <= idx ? 'on' : ''} />)}</span></td>
            </tr>
          );
        })}
      </tbody></table>
      {src && <div className="src-note">{t('sources')}: <a className="link" href={src.url} target="_blank" rel="noopener noreferrer">{src.publisher}</a>, {src.date}</div>}
    </div>
  );
}

export function KnownBlock({ state }: { state: State }) {
  const { t, l } = useI18n();
  const b = state.briefing;
  return (
    <div className="kgrid">
      <div className="rail-block">
        <h3>{t('whatWeKnow')}</h3>
        <ul className="kn">
          {b.known.map((k, i) => <li key={i} style={{ ['--c' as string]: `var(--t-${k.tier})` }}><span>{l(k)}{k.tier !== 'confirmed' && <> <TierBadge tier={k.tier} /></>}</span></li>)}
        </ul>
      </div>
      <div className="rail-block">
        <h3>{t('whatWeDontKnow')}</h3>
        <ul className="kn unknown">{b.unknown.map((k, i) => <li key={i}><span>{l(k)}</span></li>)}</ul>
      </div>
      <div className="advice">
        <b>{t('guidance')}</b>
        {b.guidance.map((g, i) => <p key={i}>{l(g)}</p>)}
      </div>
    </div>
  );
}

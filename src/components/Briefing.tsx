import { useI18n } from '../i18n';
import type { State } from '../types';
import { dayNumber, fmtEventDate, relTime } from '../lib/format';
import { TierBadge } from './ui/Badges';
import { Icon } from './ui/Icon';

const RISK_STEPS = ['very-low', 'low', 'moderate-low', 'moderate', 'high'];
const riskColor = (lvl: string) => (RISK_STEPS.indexOf(lvl) <= 1 ? 'var(--t-confirmed)' : RISK_STEPS.indexOf(lvl) <= 2 ? 'var(--t-suspected)' : 'var(--s-alert)');

export function Briefing({ state, now }: { state: State; now: number }) {
  const { t, l, lang } = useI18n();
  const b = state.briefing;
  const risk = state.risk;
  const riskSrc = state.citations[risk.source];
  return (
    <section className="panel hero" aria-labelledby="brief-h">
      <div className="hero-top">
        <span className="eyebrow"><Icon name="target" size={13} />{t('situation')}</span>
        <span className="hero-day">{t('dayN', { n: dayNumber(state.event.start, now) })} · {l(state.event.place)}</span>
      </div>
      <h1 id="brief-h">{l(b.headline)}</h1>
      <div className="hero-meta">
        <span>{t('editorialAsOf')} {fmtEventDate(b.updatedAt, lang)} ({t('irkutskTime')})</span>
        <span>{t('sinceStart', { d: fmtEventDate(state.event.start + 'T12:00:00+08:00', lang, 'day') })}</span>
      </div>

      <div className="risk" role="list" aria-label={t('whoRisk')}>
        {risk.levels.map((r) => {
          const idx = RISK_STEPS.indexOf(r.level);
          return (
            <div className="risk-cell" role="listitem" key={r.scope.en}>
              <span className="risk-scope">{l(r.scope)}</span>
              <span className="risk-level">
                {t(`risk_${r.level}`)}
                <span className="risk-bar" style={{ ['--c' as string]: riskColor(r.level) }} aria-hidden="true">
                  {RISK_STEPS.map((s, i) => <i key={s} className={i <= idx ? 'on' : ''} />)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="risk-caption">
        <TierBadge tier="confirmed" small />
        <span>{t('whoRisk')} · {riskSrc ? <a href={riskSrc.url} target="_blank" rel="noopener noreferrer" className="btn-link" style={{ fontWeight: 500 }}>{riskSrc.publisher}</a> : null} · {relTime(risk.t, lang, now)}</span>
      </div>

    </section>
  );
}

/** What we know / don't know / guidance — kept separate from the headline so key figures stay above the fold. */
export function KnownUnknown({ state }: { state: State }) {
  const { t, l } = useI18n();
  const b = state.briefing;
  return (
    <section className="panel" style={{ padding: '18px 20px' }} aria-label={t('whatWeKnow')}>
      <div className="kgrid" style={{ marginTop: 0 }}>
        <div>
          <div className="klabel">{t('whatWeKnow')}</div>
          <ul className="klist">
            {b.known.map((k, i) => (
              <li key={i} style={{ ['--c' as string]: `var(--t-${k.tier})` }}>
                <span className="b" />
                <span>{l(k)} {k.tier !== 'confirmed' && <TierBadge tier={k.tier} small />}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="klabel">{t('whatWeDontKnow')}</div>
          <ul className="klist unknown">
            {b.unknown.map((k, i) => <li key={i}><span className="b" /><span>{l(k)}</span></li>)}
          </ul>
        </div>
      </div>

      <div className="guidance">
        <Icon name="heart" size={18} style={{ color: 'var(--t-confirmed)', marginTop: 1 }} />
        <div>
          <strong>{t('guidance')}</strong>
          <ul>{b.guidance.map((g, i) => <li key={i}>{l(g)}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

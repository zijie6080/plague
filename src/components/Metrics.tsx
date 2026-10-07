import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import type { Metric, State, Tier } from '../types';
import { fmtEventDate, fmtNum } from '../lib/format';
import { TierBadge, InfoTip } from './ui/Badges';
import { AnimatedNumber, Sk } from './ui/Misc';
import { Icon } from './ui/Icon';
import { Sheet } from './ui/Sheet';
import { Citations } from './Citations';
import { Sparkline } from './ui/Charts';
import { useUI } from './ui-context';

const TIER_ORDER: Tier[] = ['confirmed', 'suspected', 'reported', 'unverified', 'disputed'];

function MetricCard({ m }: { m: Metric }) {
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  const ref = useRef<HTMLButtonElement>(null);
  const prev = useRef<string>('');
  const sig = JSON.stringify(m.tiers);
  useEffect(() => {
    if (prev.current && prev.current !== sig && ref.current) {
      ref.current.classList.remove('flash');
      void ref.current.offsetWidth;
      ref.current.classList.add('flash');
    }
    prev.current = sig;
  }, [sig]);

  const others = TIER_ORDER.filter((tier) => tier !== 'confirmed' && m.tiers[tier]);
  const reportedSeries = m.history.filter((h) => h.tier === (m.headline ? 'confirmed' : 'reported') && h.value != null).map((h) => h.value as number);
  return (
    <button className="metric" ref={ref} onClick={() => open({ kind: 'metric', id: m.id })} aria-label={l(m.label)}>
      <span className="metric-label">{l(m.label)}</span>
      {m.changed24h && <span className="metric-fresh" title={t('changed24h')} />}
      <Icon name="arrowUpRight" size={14} className="metric-open" />
      <div className="metric-value">
        {m.headline ? (
          <>
            {m.headline.approx && <span className="approx">{t('approx')}</span>}
            <span className="big"><AnimatedNumber value={m.headline.value} format={(n) => fmtNum(n, lang)} /></span>
            <TierBadge tier="confirmed" small noTip />
          </>
        ) : m.tiers.confirmed?.text ? (
          <span className="big none" style={{ color: 'var(--text)' }}>{l(m.tiers.confirmed.text)} <TierBadge tier="confirmed" small noTip /></span>
        ) : (
          <span className="big none">{t('noOfficialFigure')}</span>
        )}
      </div>
      <div className="metric-tiers">
        {others.map((tier) => {
          const o = m.tiers[tier]!;
          return (
            <span className="metric-tier" key={tier}>
              <TierBadge tier={tier} small noTip />
              {o.value != null ? <span className="v">{o.delta ? '+' : ''}{o.approx ? t('approx') : ''}{fmtNum(o.value, lang)}</span> : null}
              <span className="txt faint">{o.note ? l(o.note) : o.text ? l(o.text) : fmtEventDate(o.t, lang, 'day')}</span>
            </span>
          );
        })}
      </div>
      {reportedSeries.length > 1 && new Set(reportedSeries).size > 1 && <span className="metric-spark"><Sparkline values={reportedSeries} color="var(--text-3)" /></span>}
    </button>
  );
}

export function Metrics({ state }: { state: State | null }) {
  const { t } = useI18n();
  if (!state) {
    return (
      <div className="metrics" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="metric" key={i} style={{ cursor: 'default' }}><Sk w="50%" /><Sk w={70} h={30} style={{ marginTop: 8 }} /><Sk w="80%" style={{ marginTop: 'auto' }} /></div>
        ))}
      </div>
    );
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="metrics">{state.metrics.map((m) => <MetricCard key={m.id} m={m} />)}</div>
      <div className="metrics-note"><InfoTip body={t('keyFiguresNote')} align="left" />{t('keyFiguresNote')}</div>
    </div>
  );
}

export function MetricSheet({ state, id, onClose }: { state: State; id: string | null; onClose: () => void }) {
  const { t, l, lang } = useI18n();
  const m = state.metrics.find((x) => x.id === id);
  return (
    <Sheet open={!!m} onClose={onClose} eyebrow={t('keyFigures')} title={m ? l(m.label) : ''}>
      {m && (
        <>
          <section>
            <div className="sec-label">{t('definition')}</div>
            <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.6 }}>{l(m.definition)}</p>
          </section>
          <section>
            <div className="sec-label">{t('history')}</div>
            <div className="hist">
              {[...m.history].reverse().map((h, i) => (
                <div className="hist-row" key={i}>
                  <span className="t">{fmtEventDate(h.t, lang, 'day')}</span>
                  <div>
                    <TierBadge tier={h.tier} small />
                    {(h.note || h.text) && <div style={{ marginTop: 4, color: 'var(--text-2)' }}>{l(h.note || h.text)}</div>}
                    <Citations ids={h.sources} citations={state.citations} />
                  </div>
                  <span className="v">{h.value != null ? `${h.delta ? '+' : ''}${h.approx ? t('approx') : ''}${fmtNum(h.value, lang)}` : '—'}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </Sheet>
  );
}

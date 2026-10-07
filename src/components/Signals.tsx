import { useState } from 'react';
import { useI18n } from '../i18n';
import type { Signal, State } from '../types';
import { relTime, fmtLocal } from '../lib/format';
import { Panel, Sk } from './ui/Misc';
import { SeverityBadge } from './ui/Badges';
import { Icon } from './ui/Icon';
import { Sheet } from './ui/Sheet';
import { useUI } from './ui-context';

const SEV_RANK = { alert: 0, watch: 1, info: 2 } as const;

function SignalRow({ s, now }: { s: Signal; now: number }) {
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  return (
    <button className="sig" data-sev={s.severity} onClick={() => open({ kind: 'signal', id: s.id })}>
      <span className="bar" />
      <span style={{ minWidth: 0 }}>
        <span className="sig-head">
          <SeverityBadge sev={s.severity} />
          <span className="sig-rule">{t(`rule_${s.rule}`)}</span>
          <span className="mono">{relTime(s.t, lang, now)}</span>
        </span>
        <span className="sig-title" style={{ display: 'block' }}>{l(s.title)}</span>
        <span className="sig-detail" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l(s.detail)}</span>
      </span>
    </button>
  );
}

export function Signals({ state, now }: { state: State | null; now: number }) {
  const { t } = useI18n();
  const [showRecent, setShowRecent] = useState(false);
  const active = [...(state?.anomalies.active || [])].sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || Date.parse(b.t) - Date.parse(a.t));
  const counts = { alert: 0, watch: 0, info: 0 };
  active.forEach((s) => counts[s.severity]++);
  return (
    <Panel id="signals" eyebrow={<><Icon name="pulse" size={13} />{t('navSignals')}</>} title={t('signalsTitle')} sub={t('signalsSub')}>
      {!state ? <Sk h={200} /> : (
        <>
          <div className="sig-summary">
            {(['alert', 'watch', 'info'] as const).map((k) => (
              <div key={k}><SeverityBadge sev={k} /><div className="n">{counts[k]}</div></div>
            ))}
          </div>
          <div className="sig-scroll">
            {!active.length && <p className="muted">{t('noSignals')}</p>}
            <div className="sig-list">{active.map((s) => <SignalRow key={s.id} s={s} now={now} />)}</div>
            {state.anomalies.recent.length > 0 && (
              <>
                <button className="tl-expand" style={{ marginTop: 12 }} onClick={() => setShowRecent((x) => !x)}>
                  <Icon name="chevronDown" size={13} style={{ transform: showRecent ? 'rotate(180deg)' : undefined }} />{t('recentSignals')} · {state.anomalies.recent.length}
                </button>
                {showRecent && <div className="sig-list" style={{ opacity: 0.7 }}>{state.anomalies.recent.map((s) => <SignalRow key={s.id} s={s} now={now} />)}</div>}
              </>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

export function SignalSheet({ state, id, onClose }: { state: State; id: string | null; onClose: () => void }) {
  const { t, l, lang } = useI18n();
  const s = [...state.anomalies.active, ...state.anomalies.recent].find((x) => x.id === id);
  return (
    <Sheet open={!!s} onClose={onClose} eyebrow={s ? <>{t(`rule_${s.rule}`)}</> : null} title={s ? l(s.title) : ''}>
      {s && (
        <>
          <section style={{ display: 'flex', gap: 10, alignItems: 'center' }}><SeverityBadge sev={s.severity} /><span className="faint">{t('firstDetected')} {fmtLocal(s.firstSeen, lang)}</span></section>
          <section><p style={{ margin: 0, fontSize: 14, lineHeight: 1.65 }}>{l(s.detail)}</p></section>
          {s.excerpt && s.excerpt.length > 0 && (
            <section>
              <div className="sec-label">{t('pageChanged')}</div>
              <div className="stack" style={{ gap: 6 }}>{s.excerpt.map((x, i) => <div key={i} style={{ fontSize: 12.5, padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)', borderLeft: '2px solid var(--t-confirmed)' }}>+ {x}</div>)}</div>
            </section>
          )}
          {s.value != null && (
            <section style={{ display: 'flex', gap: 24 }}>
              <div><div className="sec-label">Value</div><div className="mono" style={{ fontSize: 20, fontWeight: 600 }}>{s.value}</div></div>
              {s.baseline != null && <div><div className="sec-label">Baseline</div><div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-2)' }}>{s.baseline}</div></div>}
            </section>
          )}
          {s.url && <section><a className="btn-link" href={s.url} target="_blank" rel="noopener noreferrer">{t('openSource')}<Icon name="arrowUpRight" size={12} /></a></section>}
        </>
      )}
    </Sheet>
  );
}

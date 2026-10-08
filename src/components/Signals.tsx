import { useState } from 'react';
import { useI18n } from '../i18n';
import type { Signal, State } from '../types';
import { relTime, fmtLocal } from '../lib/format';
import { Sk } from './ui/Misc';
import { SeverityBadge } from './ui/Badges';
import { Sheet } from './ui/Sheet';
import { useUI } from './ui-context';

const RANK = { alert: 0, watch: 1, info: 2 } as const;

function Row({ s, now }: { s: Signal; now: number }) {
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  return (
    <button className="sig" onClick={() => open({ kind: 'signal', id: s.id })}>
      <SeverityBadge sev={s.severity} />
      <span style={{ minWidth: 0 }}>
        <span className="sig-title" style={{ display: 'block' }}>{l(s.title)}</span>
        <span className="sig-detail">{l(s.detail)}</span>
        <span className="sig-meta" style={{ display: 'block' }}>{t(`rule_${s.rule}`)} · {relTime(s.t, lang, now)}</span>
      </span>
    </button>
  );
}

export function Signals({ state, now }: { state: State | null; now: number }) {
  const { t } = useI18n();
  const [showInfo, setShowInfo] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  if (!state) return <div id="signals"><Sk h={200} /></div>;
  const active = [...state.anomalies.active].sort((a, b) => RANK[a.severity] - RANK[b.severity] || Date.parse(b.t) - Date.parse(a.t));
  const main = active.filter((s) => s.severity !== 'info');
  const info = active.filter((s) => s.severity === 'info');
  return (
    <div id="signals">
      <h3 className="sub-head">{t('signalsTitle')}</h3>
      <p className="faint small" style={{ margin: '0 0 6px' }}>{t('signalsSub')}</p>
      <div className="sig-counts">
        {(['alert', 'watch', 'info'] as const).map((k) => <span key={k}><b>{active.filter((s) => s.severity === k).length}</b>{t(`sev_${k}`)}</span>)}
      </div>
      {!main.length && <p className="muted small">{t('noSignals')}</p>}
      {main.map((s) => <Row key={s.id} s={s} now={now} />)}
      {info.length > 0 && <button className="more" onClick={() => setShowInfo((x) => !x)}>{t('sev_info')} · {info.length} {showInfo ? '−' : '+'}</button>}
      {showInfo && info.map((s) => <Row key={s.id} s={s} now={now} />)}
      {state.anomalies.recent.length > 0 && <div><button className="more" onClick={() => setShowRecent((x) => !x)}>{t('recentSignals')} · {state.anomalies.recent.length} {showRecent ? '−' : '+'}</button></div>}
      {showRecent && <div style={{ opacity: 0.7 }}>{state.anomalies.recent.map((s) => <Row key={s.id} s={s} now={now} />)}</div>}
    </div>
  );
}

export function SignalSheet({ state, id, onClose }: { state: State; id: string | null; onClose: () => void }) {
  const { t, l, lang } = useI18n();
  const s = [...state.anomalies.active, ...state.anomalies.recent].find((x) => x.id === id);
  return (
    <Sheet open={!!s} onClose={onClose} eyebrow={s ? t(`rule_${s.rule}`) : null} title={s ? l(s.title) : ''}>
      {s && (
        <>
          <section><SeverityBadge sev={s.severity} /> <span className="faint small">· {t('firstDetected')} {fmtLocal(s.firstSeen, lang)}</span></section>
          <section><p style={{ margin: 0 }}>{l(s.detail)}</p></section>
          {s.excerpt && s.excerpt.length > 0 && (
            <section><div className="lbl">{t('pageChanged')}</div>{s.excerpt.map((x, i) => <p key={i} className="muted small" style={{ margin: '0 0 6px', paddingLeft: 10, borderLeft: '2px solid var(--t-confirmed)' }}>{x}</p>)}</section>
          )}
          {s.url && <section><a className="link" href={s.url} target="_blank" rel="noopener noreferrer">{t('openSource')} ↗</a></section>}
        </>
      )}
    </Sheet>
  );
}

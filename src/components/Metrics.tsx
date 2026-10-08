import { useI18n } from '../i18n';
import type { State } from '../types';
import { fmtEventDate, fmtNum } from '../lib/format';
import { TierBadge } from './ui/Badges';
import { Sheet } from './ui/Sheet';
import { Citations } from './Citations';

export function MetricSheet({ state, id, onClose }: { state: State; id: string | null; onClose: () => void }) {
  const { t, l, lang } = useI18n();
  const m = state.metrics.find((x) => x.id === id);
  return (
    <Sheet open={!!m} onClose={onClose} eyebrow={t('keyFigures')} title={m ? l(m.label) : ''}>
      {m && (
        <>
          <section><div className="lbl">{t('definition')}</div><p style={{ margin: 0, color: 'var(--ink-2)' }}>{l(m.definition)}</p></section>
          <section>
            <div className="lbl">{t('history')}</div>
            {[...m.history].reverse().map((h, i) => (
              <div className="hist-row" key={i}>
                <span className="t">{fmtEventDate(h.t, lang, 'day')}</span>
                <div>
                  <TierBadge tier={h.tier} />
                  {(h.note || h.text) && <div className="muted" style={{ marginTop: 2 }}>{l(h.note || h.text)}</div>}
                  <Citations ids={h.sources} citations={state.citations} />
                </div>
                <span className="v">{h.value != null ? `${h.delta ? '+' : ''}${h.approx ? '~' : ''}${fmtNum(h.value, lang)}` : '—'}</span>
              </div>
            ))}
          </section>
        </>
      )}
    </Sheet>
  );
}

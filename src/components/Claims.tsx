import { useState } from 'react';
import { useI18n } from '../i18n';
import type { State } from '../types';
import { Section } from './ui/Misc';
import { Citations } from './Citations';

export function Claims({ state }: { state: State }) {
  const { t, l } = useI18n();
  const [open, setOpen] = useState<string | null>(state.claims[0]?.id ?? null);
  return (
    <Section id="claims" title={t('claimsTitle')} sub={t('claimsSub')}>
      <div className="claims-wrap">
        <ul className="claims">
          {state.claims.map((c) => {
            const isOpen = open === c.id;
            return (
              <li key={c.id} className={isOpen ? 'open' : ''}>
                <button className="claim-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)}>
                  <span className="claim-text">{l(c.claim)}</span>
                  <span className="verdict" data-v={c.verdict}>{t(`verdict_${c.verdict}`)}</span>
                  <span className="chev" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                </button>
                <div className="claim-body" hidden={!isOpen}>
                  <div className="claim-cols">
                    <div><h5>{t('officialLine')}</h5><p>{l(c.official)}</p></div>
                    <div><h5>{t('independentLine')}</h5><p>{l(c.independent)}</p></div>
                  </div>
                  <Citations ids={c.sources} citations={state.citations} max={4} />
                  {c.link && <a className="more" href={c.link}>{t('seeData')} →</a>}
                </div>
              </li>
            );
          })}
        </ul>
        <aside className="open-q">
          <h3>{t('whatWeDontKnow')}</h3>
          <ol>{state.briefing.unknown.map((u, i) => <li key={i}>{l(u)}</li>)}</ol>
          <div className="verdict-key">
            {(['confirmed', 'reported', 'disputed', 'denied', 'misleading', 'unverified'] as const).map((v) => (
              <div key={v}><span className="verdict" data-v={v}>{t(`verdict_${v}`)}</span><span className="faint small">{t(`verdictHelp_${v}`)}</span></div>
            ))}
          </div>
        </aside>
      </div>
    </Section>
  );
}

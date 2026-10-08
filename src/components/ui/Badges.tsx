import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import type { Severity, SourceType, Tier } from '../../types';
import { Icon } from './Icon';

/** One small glyph per tier so the tier never relies on colour alone. */
function TierGlyph({ tier }: { tier: Tier }) {
  const p = { className: 'glyph', viewBox: '0 0 10 10', 'aria-hidden': true } as const;
  switch (tier) {
    case 'confirmed': return <svg {...p}><circle cx="5" cy="5" r="4.5" fill="currentColor" /></svg>;
    case 'suspected': return <svg {...p}><circle cx="5" cy="5" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M5 1.1a3.9 3.9 0 0 1 0 7.8z" fill="currentColor" /></svg>;
    case 'reported': return <svg {...p}><circle cx="5" cy="5" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
    case 'unverified': return <svg {...p}><circle cx="5" cy="5" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.5 1.4" /></svg>;
    case 'disputed': return <svg {...p}><path d="M5 .9 9.3 8.8H.7z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>;
  }
}

export function TierBadge({ tier, noTip, tipAlign }: { tier: Tier; small?: boolean; noTip?: boolean; tipAlign?: 'right' }) {
  const { t } = useI18n();
  const el = <span className="tier" data-tier={tier}><TierGlyph tier={tier} />{t(`tier_${tier}`)}</span>;
  return noTip ? el : <Tip label={t(`tier_${tier}`)} body={t(`tierHelp_${tier}`)} align={tipAlign}>{el}</Tip>;
}

export function SourceTypeBadge({ type }: { type: SourceType }) {
  const { t } = useI18n();
  const el = <span className="stype" data-type={type}>{t(`st_${type}`)}</span>;
  return type === 'caution' || type === 'state_media' ? <Tip body={t(`stHelp_${type}`)}>{el}</Tip> : el;
}

export function SeverityBadge({ sev }: { sev: Severity }) {
  const { t } = useI18n();
  return (
    <span className="sev" data-sev={sev}>
      <svg viewBox="0 0 10 10" aria-hidden="true">
        {sev === 'alert' && <path d="M5 .8 9.4 9H.6z" fill="currentColor" />}
        {sev === 'watch' && <rect x="1.6" y="1.6" width="6.8" height="6.8" transform="rotate(45 5 5)" fill="currentColor" />}
        {sev === 'info' && <circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      </svg>
      {t(`sev_${sev}`)}
    </span>
  );
}

export function Tip({ children, label, body, align }: { children: ReactNode; label?: string; body: ReactNode; align?: 'right' }) {
  return (
    <span className="tipwrap" tabIndex={0}>
      {children}
      <span className={`tip${align ? ' ' + align : ''}`} role="tooltip">{label && <strong>{label}</strong>}{body}</span>
    </span>
  );
}

export function InfoTip({ body, label, align }: { body: ReactNode; label?: string; align?: 'right' }) {
  return <Tip body={body} label={label} align={align}><span className="info" aria-label={label || 'info'}><Icon name="info" size={13} /></span></Tip>;
}

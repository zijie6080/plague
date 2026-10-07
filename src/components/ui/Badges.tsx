import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import type { Severity, SourceType, Tier } from '../../types';
import { Icon } from './Icon';

/** A distinct glyph per tier so the tier never relies on colour alone. */
function TierGlyph({ tier }: { tier: Tier }) {
  const common = { className: 'glyph', viewBox: '0 0 10 10', 'aria-hidden': true } as const;
  switch (tier) {
    case 'confirmed':
      return <svg {...common}><circle cx="5" cy="5" r="4.2" fill="currentColor" /><path d="M3 5.1 4.4 6.4 7 3.7" stroke="var(--surface)" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'suspected':
      return <svg {...common}><circle cx="5" cy="5" r="3.7" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M5 1.3a3.7 3.7 0 0 1 0 7.4z" fill="currentColor" /></svg>;
    case 'reported':
      return <svg {...common}><rect x="1.2" y="1.2" width="7.6" height="7.6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M3.3 4h3.4M3.3 6h2.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>;
    case 'unverified':
      return <svg {...common}><circle cx="5" cy="5" r="3.7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.6 1.4" /></svg>;
    case 'disputed':
      return <svg {...common}><path d="M5 1 9.2 8.6H.8z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M5 4v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
  }
}

export function TierBadge({ tier, small, noTip, tipAlign }: { tier: Tier; small?: boolean; noTip?: boolean; tipAlign?: 'left' | 'right' }) {
  const { t } = useI18n();
  const badge = (
    <span className={`tier${small ? ' sm' : ''}`} data-tier={tier}>
      <TierGlyph tier={tier} />
      {t(`tier_${tier}`)}
    </span>
  );
  if (noTip) return badge;
  return (
    <Tip label={t(`tier_${tier}`)} body={t(`tierHelp_${tier}`)} align={tipAlign}>
      {badge}
    </Tip>
  );
}

export function SourceTypeBadge({ type }: { type: SourceType }) {
  const { t } = useI18n();
  const el = <span className="stype" data-type={type}>{t(`st_${type}`)}</span>;
  if (type === 'caution' || type === 'state_media') return <Tip label={t(`st_${type}`)} body={t(`stHelp_${type}`)}>{el}</Tip>;
  return el;
}

export function SeverityBadge({ sev }: { sev: Severity }) {
  const { t } = useI18n();
  return (
    <span className="sev" data-sev={sev}>
      <svg className="sev-ic" viewBox="0 0 12 12" aria-hidden="true">
        {sev === 'alert' && <path d="M6 1.2 11 10.4H1z" fill="currentColor" />}
        {sev === 'watch' && <rect x="1.8" y="1.8" width="8.4" height="8.4" rx="1.5" transform="rotate(45 6 6)" fill="currentColor" />}
        {sev === 'info' && <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />}
      </svg>
      {t(`sev_${sev}`)}
    </span>
  );
}

export function Tip({ children, label, body, align }: { children: ReactNode; label?: string; body: ReactNode; align?: 'left' | 'right' }) {
  return (
    <span className="tipwrap" tabIndex={0}>
      {children}
      <span className={`tip${align ? ' ' + align : ''}`} role="tooltip">
        {label && <strong>{label}</strong>}
        {body}
      </span>
    </span>
  );
}

export function InfoTip({ body, label, align }: { body: ReactNode; label?: string; align?: 'left' | 'right' }) {
  return (
    <Tip body={body} label={label} align={align}>
      <span className="info-i" aria-label={label || 'info'}><Icon name="info" size={13} /></span>
    </Tip>
  );
}

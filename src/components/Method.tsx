import { useI18n } from '../i18n';
import type { SourceType, Tier } from '../types';
import { Section } from './ui/Misc';
import { SourceTypeBadge, TierBadge } from './ui/Badges';

const TIERS: Tier[] = ['confirmed', 'suspected', 'reported', 'unverified', 'disputed'];
const TYPES: SourceType[] = ['official', 'intl', 'wire', 'media', 'state_media', 'caution'];

export function Method() {
  const { t } = useI18n();
  return (
    <Section id="method" title={t('methodTitle')}>
      <div className="method">
        <div>
          <p>{t('methodBody')}</p>
          <p>{t('stHelp_caution')} {t('stHelp_state_media')}</p>
          <p style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>{TYPES.map((ty) => <SourceTypeBadge key={ty} type={ty} />)}</p>
          <p className="faint">{t('disclaimer')}</p>
        </div>
        <dl>{TIERS.map((tier) => [<dt key={`${tier}t`}><TierBadge tier={tier} noTip /></dt>, <dd key={`${tier}d`}>{t(`tierHelp_${tier}`)}</dd>])}</dl>
      </div>
    </Section>
  );
}

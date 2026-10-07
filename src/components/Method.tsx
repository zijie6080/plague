import { useI18n } from '../i18n';
import type { SourceType, Tier } from '../types';
import { Panel } from './ui/Misc';
import { SourceTypeBadge, TierBadge } from './ui/Badges';
import { Icon } from './ui/Icon';

const TIERS: Tier[] = ['confirmed', 'suspected', 'reported', 'unverified', 'disputed'];
const TYPES: SourceType[] = ['official', 'intl', 'wire', 'media', 'state_media', 'caution'];

export function Method() {
  const { t } = useI18n();
  return (
    <Panel eyebrow={<><Icon name="shield" size={13} />{t('methodTitle')}</>} title={t('methodTitle')}>
      <div className="method">
        <div className="stack" style={{ gap: 10 }}>
          <p>{t('methodBody')}</p>
          <p className="faint">{t('disclaimer')}</p>
        </div>
        <dl>
          <div className="klabel">{t('tierLegend')}</div>
          {TIERS.map((tier) => (
            <div key={tier}><dt><TierBadge tier={tier} noTip /></dt><dd>{t(`tierHelp_${tier}`)}</dd></div>
          ))}
        </dl>
        <dl>
          <div className="klabel">{t('sourceTypes')}</div>
          <div className="chips">{TYPES.map((ty) => <SourceTypeBadge key={ty} type={ty} />)}</div>
          <dd>{t('stHelp_caution')}</dd>
          <dd>{t('stHelp_state_media')}</dd>
        </dl>
      </div>
    </Panel>
  );
}

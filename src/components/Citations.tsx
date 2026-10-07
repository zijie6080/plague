import { useI18n } from '../i18n';
import type { State } from '../types';
import { Icon } from './ui/Icon';

export function Citations({ ids, citations, max = 6 }: { ids: string[]; citations: State['citations']; max?: number }) {
  const { t } = useI18n();
  const list = ids.map((id) => citations[id]).filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return (
    <div className="tl-sources">
      {list.map((c) => (
        <a key={c.url + c.publisher} className="srcpill" href={c.url} target="_blank" rel="noopener noreferrer" title={c.title}>
          <span className="pub">{c.publisher}</span>
          <span className="ttl">{c.urlPrecision === 'search' ? t('searchLink') : c.title}</span>
          <Icon name="arrowUpRight" size={11} />
        </a>
      ))}
    </div>
  );
}

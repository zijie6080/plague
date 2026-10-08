import { useI18n } from '../i18n';
import type { State } from '../types';

export function Citations({ ids, citations, max = 6 }: { ids: string[]; citations: State['citations']; max?: number }) {
  const { t } = useI18n();
  const list = ids.map((id) => citations[id]).filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return (
    <div className="cites">
      {list.map((c) => (
        <a key={c.url + c.publisher} href={c.url} target="_blank" rel="noopener noreferrer" title={c.title}>
          <b>{c.publisher}</b>
          <span>{c.urlPrecision === 'search' ? t('searchLink') : c.title}</span>
        </a>
      ))}
    </div>
  );
}

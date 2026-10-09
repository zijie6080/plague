import { useI18n } from '../i18n';
import type { SourceHealth, State } from '../types';
import { fmtLocal, relTime } from '../lib/format';
import { Sk } from './ui/Misc';
import { SourceTypeBadge, Tip } from './ui/Badges';

const GROUPS: { key: string; match: (s: SourceHealth) => boolean }[] = [
  { key: 'group_official', match: (s) => s.sourceType === 'official' || s.sourceType === 'intl' },
  { key: 'group_news', match: (s) => ['aggregator', 'media', 'state_media', 'wire'].includes(s.sourceType) },
  { key: 'group_market', match: (s) => s.sourceType === 'market' },
];

function Runs({ runs }: { runs: SourceHealth['runs'] }) {
  const slots = Array.from({ length: 24 }, (_, i) => runs[23 - i]);
  const maxMs = Math.max(500, ...runs.map((r) => r.ms || 0));
  return <span className="runs" aria-hidden="true">{slots.map((r, i) => !r ? <i key={i} className="empty" /> : <i key={i} className={r.ok ? '' : 'fail'} style={{ height: `${Math.max(3, Math.min(14, ((r.ms || 0) / maxMs) * 14))}px` }} title={`${new Date(r.t).toLocaleString()} · ${r.ms}ms · ${r.n}`} />)}</span>;
}

export function SourcesPanel({ state, now }: { state: State | null; now: number }) {
  const { t, l, lang } = useI18n();
  if (!state) return <div><Sk h={240} /></div>;
  const active = state.sources.filter((s) => s.status !== 'idle');
  const healthy = active.filter((s) => s.status === 'ok').length;
  return (
    <div>
      <h3 className="sub-head">{t('systemTitle')}<span className="count">{t('healthy', { a: healthy, b: active.length })}</span></h3>
      <p className="faint small" style={{ margin: '0 0 10px' }}>{t('systemSub')}</p>
      <div className="tablewrap">
        <table className="src-table">
          <thead><tr><th>{t('sources')}</th><th>{t('statusCol')}</th><th className="hide-sm">{t('lastSuccess')}</th><th className="hide-sm">24×</th></tr></thead>
          <tbody>
            {GROUPS.map((g) => {
              const rows = state.sources.filter(g.match);
              if (!rows.length) return null;
              return [
                <tr className="grp" key={g.key}><td colSpan={4}>{t(g.key)}</td></tr>,
                ...rows.map((s) => {
                  const st = <span className="state" data-s={s.status}><i />{t(`status_${s.status}`)}</span>;
                  const why = [s.lastError, s.note ? l(s.note) : null].filter(Boolean).join(' — ');
                  return (
                    <tr key={s.id}>
                      <td className="nm">{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{l(s.name)}</a> : l(s.name)}<small>{t(`kind_${s.kind}`)} · {t('every', { n: s.every })} · <SourceTypeBadge type={s.sourceType} /></small></td>
                      <td>{why ? <Tip body={why} align="right">{st}</Tip> : st}{s.status !== 'ok' && s.lastError && <span className="err">{s.lastError}</span>}</td>
                      <td className="n hide-sm">{s.lastOk ? relTime(s.lastOk, lang, now) : t('never')}</td>
                      <td className="hide-sm"><Runs runs={s.runs} /></td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>
      <p className="faint small">{t('generated')} {fmtLocal(state.generatedAt, lang)}</p>
    </div>
  );
}

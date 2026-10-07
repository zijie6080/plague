import { useI18n } from '../i18n';
import type { SourceHealth, State } from '../types';
import { fmtLocal, relTime } from '../lib/format';
import { Panel, Sk } from './ui/Misc';
import { SourceTypeBadge, Tip } from './ui/Badges';
import { Icon } from './ui/Icon';

const GROUPS: { key: string; match: (s: SourceHealth) => boolean }[] = [
  { key: 'group_official', match: (s) => s.sourceType === 'official' || s.sourceType === 'intl' },
  { key: 'group_news', match: (s) => ['aggregator', 'media', 'state_media', 'wire'].includes(s.sourceType) },
  { key: 'group_market', match: (s) => s.sourceType === 'market' },
];

function Runs({ runs }: { runs: SourceHealth['runs'] }) {
  const slots = Array.from({ length: 24 }, (_, i) => runs[23 - i]);
  const maxMs = Math.max(500, ...runs.map((r) => r.ms || 0));
  return (
    <span className="runs" aria-hidden="true">
      {slots.map((r, i) => !r ? <i key={i} className="empty" /> : <i key={i} className={r.ok ? '' : 'fail'} style={{ height: `${Math.max(4, Math.min(18, ((r.ms || 0) / maxMs) * 18))}px` }} title={`${new Date(r.t).toLocaleString()} · ${r.ok ? 'ok' : 'fail'} · ${r.ms}ms · ${r.n}`} />)}
    </span>
  );
}

function Status({ s }: { s: SourceHealth }) {
  const { t, l } = useI18n();
  const el = <span className="status" data-s={s.status}><i />{t(`status_${s.status}`)}</span>;
  const body = [s.lastError, s.note ? l(s.note) : null].filter(Boolean).join(' — ');
  return body ? <Tip body={body}>{el}</Tip> : el;
}

export function SourcesPanel({ state, now }: { state: State | null; now: number }) {
  const { t, l, lang } = useI18n();
  const sources = state?.sources || [];
  const active = sources.filter((s) => s.status !== 'idle');
  const healthy = active.filter((s) => s.status === 'ok').length;
  return (
    <Panel
      id="system"
      eyebrow={<><Icon name="server" size={13} />{t('navSystem')}</>}
      title={t('systemTitle')}
      sub={t('systemSub')}
      tools={state ? (
        <div className="src-health">
          <span className="src-meter">{active.map((s) => <i key={s.id} className={s.status} />)}</span>
          {t('healthy', { a: healthy, b: active.length })}
        </div>
      ) : undefined}
    >
      {!state ? <Sk h={240} /> : (
        <>
          <div className="tablewrap">
            <table className="src-table">
              <thead>
                <tr>
                  <th>{t('sources')}</th><th><span className="sr-only">{t('typeCol')}</span></th><th>{t('statusCol')}</th><th>{t('lastSuccess')}</th><th>{t('nextRun')}</th><th>{t('latency')}</th><th>{t('itemsLabel')}</th><th>24×</th>
                </tr>
              </thead>
              <tbody>
                {GROUPS.map((g) => {
                  const rows = sources.filter(g.match);
                  if (!rows.length) return null;
                  return [
                    <tr className="grp" key={g.key}><td colSpan={8}>{t(g.key)}</td></tr>,
                    ...rows.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <span className="src-name">
                            {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{l(s.name)}</a> : l(s.name)}
                            <span className="sub">{t(`kind_${s.kind}`)} · {t('every', { n: s.every })}{s.pageChangedAt ? ` · ${t('pageChanged')} ${relTime(s.pageChangedAt, lang, now)}` : ''}</span>
                          </span>
                        </td>
                        <td><SourceTypeBadge type={s.sourceType} /></td>
                        <td><Status s={s} />{s.status !== 'ok' && s.lastError && <span className="src-err" title={s.lastError}>{s.lastError}</span>}</td>
                        <td className="mono" title={s.lastOk || ''}>{s.lastOk ? relTime(s.lastOk, lang, now) : t('never')}</td>
                        <td className="mono faint">{s.nextRun ? (Date.parse(s.nextRun) > now ? relTime(s.nextRun, lang, now, true) : '…') : '—'}</td>
                        <td className="mono faint">{s.lastMs != null ? `${s.lastMs}ms` : '—'}</td>
                        <td className="mono">{s.items ?? '—'}</td>
                        <td><Runs runs={s.runs} /></td>
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
          <div className="src-cards">
            {sources.map((s) => (
              <div className="src-card" key={s.id}>
                <div className="r" style={{ color: 'var(--text)' }}><strong>{l(s.name)}</strong><Status s={s} /></div>
                <div className="r"><span>{t(`kind_${s.kind}`)} · {t('every', { n: s.every })}</span><SourceTypeBadge type={s.sourceType} /></div>
                <div className="r"><span>{t('lastSuccess')}</span><span className="mono">{s.lastOk ? relTime(s.lastOk, lang, now) : t('never')}</span></div>
                <div className="r"><span>{t('itemsLabel')}</span><span className="mono">{s.items ?? '—'}</span></div>
                <Runs runs={s.runs} />
                {s.status !== 'ok' && s.lastError && <span className="src-err">{s.lastError}</span>}
              </div>
            ))}
          </div>
          <div className="faint" style={{ fontSize: 12, marginTop: 10 }}>{t('generated')} {fmtLocal(state.generatedAt, lang)}</div>
        </>
      )}
    </Panel>
  );
}

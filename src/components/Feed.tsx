import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import type { Bulletin, NewsCluster, State } from '../types';
import { fmtEventDate, hostLabel, relTime } from '../lib/format';
import { Panel, Segmented, Sk } from './ui/Misc';
import { SourceTypeBadge, TierBadge, InfoTip } from './ui/Badges';
import { Icon } from './ui/Icon';
import { StackedBars } from './ui/Charts';
import { Citations } from './Citations';

type Tab = 'official' | 'news';
const TOPICS = ['second-case', 'who', 'diplomacy', 'quarantine', 'pharmacy', 'lab', 'border', 'denial'];

function BulletinItem({ b, state, now }: { b: Bulletin; state: State; now: number }) {
  const { t, l, lang } = useI18n();
  const title = b.auto ? b.title.orig || b.title.en : l(b.title);
  return (
    <article className="feed-item">
      <div className="feed-meta">
        <span className="pub">{l(b.issuer)}</span>
        <SourceTypeBadge type={b.sourceType} />
        {!b.auto && <TierBadge tier="confirmed" small />}
        {b.auto && <span className="stype">{t('autoCollected')}</span>}
        <span className="t" title={b.t}>{b.auto ? relTime(b.t, lang, now) : fmtEventDate(b.t, lang, 'day')}</span>
      </div>
      {b.url ? <a className="feed-title" href={b.url} target="_blank" rel="noopener noreferrer">{title}</a> : <div className="feed-title">{title}</div>}
      {b.auto && b.lang && b.lang !== lang && <div className="faint" style={{ fontSize: 11.5 }}>{t('originalLanguage')} · {b.lang.toUpperCase()}</div>}
      {b.auto && b.summary && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-2)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.summary}</p>}
      {b.points.length > 0 && <ul className="feed-points">{b.points.map((p, i) => <li key={i}>{l(p)}</li>)}</ul>}
      {b.sources.length > 0 && (
        <div>
          {b.via && <span className="faint" style={{ fontSize: 11.5 }}>{t('via')}</span>}
          <Citations ids={b.sources} citations={state.citations} max={3} />
        </div>
      )}
    </article>
  );
}

function NewsItem({ n, now, isNew }: { n: NewsCluster; now: number; isNew: boolean }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <article className={`feed-item${isNew ? ' tl-item new' : ''}`} style={isNew ? { margin: 0, padding: '12px 0' } : undefined}>
      <div className="feed-meta">
        <span className="pub">{n.publisher || hostLabel(n.host)}</span>
        <SourceTypeBadge type={n.sourceType} />
        <span className="t" title={n.t}>{relTime(n.t, lang, now)}</span>
        {n.lang !== lang && <span className="faint">{n.lang.toUpperCase()}</span>}
        {n.topics.slice(0, 2).map((tp) => <span key={tp} className="tl-cat">{t(`topic_${tp}`)}</span>)}
      </div>
      <a className="feed-title" href={n.url} target="_blank" rel="noopener noreferrer">{n.title}</a>
      {n.also.length > 0 && (
        <div className="feed-also">
          <button className="tl-expand" style={{ marginTop: 0 }} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <Icon name="chevronDown" size={12} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
            {t('alsoCovered', { n: n.also.length })}
          </button>
          {!open && <span>{n.also.slice(0, 3).map((a) => a.publisher || hostLabel(a.host)).join(' · ')}{n.also.length > 3 ? ' …' : ''}</span>}
          {open && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', marginTop: 4 }}>
              {n.also.map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <SourceTypeBadge type={a.sourceType} />
                  <span style={{ fontWeight: 600 }}>{a.publisher || hostLabel(a.host)}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{a.title}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function Feed({ state, now, seen }: { state: State | null; now: number; seen: Set<string> }) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<Tab>(() => (sessionStorage.getItem('feedTab') as Tab) || 'official');
  const [langF, setLangF] = useState<'all' | 'zh' | 'en' | 'ru'>('all');
  const [topic, setTopic] = useState<string | null>(null);
  const [hideCaution, setHideCaution] = useState(false);
  const [limit, setLimit] = useState(40);

  const news = useMemo(() => (state?.news || []).filter((n) =>
    (langF === 'all' || n.lang === langF) && (!topic || n.topics.includes(topic)) && (!hideCaution || n.sourceType !== 'caution')), [state, langF, topic, hideCaution]);
  const newCount = state && seen.size ? state.news.filter((n) => !seen.has(`n:${n.id}`)).length : 0;
  const tFmt = (ms: number) => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'numeric', day: 'numeric' }).format(ms);
  const select = (v: Tab) => { setTab(v); sessionStorage.setItem('feedTab', v); };

  return (
    <Panel
      id="feed"
      eyebrow={<><Icon name="news" size={13} />{t('navFeed')}</>}
      title={t('feedTitle')}
      tools={<Segmented value={tab} onChange={select} options={[
        { value: 'official', label: <>{t('tabOfficial')} <span className="faint mono">{state?.bulletins.length ?? ''}</span></> },
        { value: 'news', label: <>{t('tabNews')} <span className="faint mono">{state?.news.length ?? ''}</span></> },
      ]} />}
    >
      {!state && Array.from({ length: 6 }, (_, i) => <div key={i} style={{ padding: '12px 0' }}><Sk w={160} h={10} /><Sk w="90%" h={14} style={{ marginTop: 8 }} /></div>)}

      {state && tab === 'official' && (
        <div className="feed-scroll">
          <div className="feed-list">{state.bulletins.map((b) => <BulletinItem key={b.id} b={b} state={state} now={now} />)}</div>
        </div>
      )}

      {state && tab === 'news' && (
        <>
          <div className="vol">
            <div className="chart-title">{t('volume7d')}<InfoTip body={t('volumeNote')} /></div>
            <StackedBars
              data={state.newsVolume}
              keys={[
                { key: 'official', label: `${t('st_official')} / ${t('st_intl')}`, color: 'var(--series-3)' },
                { key: 'media', label: t('st_media'), color: 'var(--series-1)' },
                { key: 'caution', label: t('st_caution'), color: 'var(--series-2)' },
              ]}
              tFormat={tFmt}
              ariaLabel={t('volume7d')}
            />
            <div className="legend" style={{ marginTop: 6, marginBottom: 0 }}>
              <span className="li"><span className="ln" style={{ background: 'var(--series-3)', height: 8, width: 8, borderRadius: 2 }} />{t('st_official')} / {t('st_intl')}</span>
              <span className="li"><span className="ln" style={{ background: 'var(--series-1)', height: 8, width: 8, borderRadius: 2 }} />{t('st_media')}</span>
              <span className="li"><span className="ln" style={{ background: 'var(--series-2)', height: 8, width: 8, borderRadius: 2 }} />{t('st_caution')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '10px 0 6px' }}>
            <Segmented value={langF} onChange={setLangF} options={[{ value: 'all', label: t('allLanguages') }, { value: 'zh', label: '中文' }, { value: 'en', label: 'EN' }, { value: 'ru', label: 'RU' }]} />
            <label className="toggle"><input type="checkbox" checked={hideCaution} onChange={(e) => setHideCaution(e.target.checked)} />{t('hideCaution')}</label>
          </div>
          <div className="chips scroll" style={{ marginBottom: 6 }}>
            {TOPICS.map((tp) => <button key={tp} className="chip" aria-pressed={topic === tp} onClick={() => setTopic(topic === tp ? null : tp)}>{t(`topic_${tp}`)}</button>)}
          </div>
          <div className="feed-scroll">
            {newCount > 0 && <div className="newpill"><Icon name="refresh" size={12} />{t('newItems', { n: newCount })}</div>}
            {!news.length && <p className="muted">{t('noResults')}</p>}
            <div className="feed-list">{news.slice(0, limit).map((n) => <NewsItem key={n.id} n={n} now={now} isNew={seen.size > 0 && !seen.has(`n:${n.id}`)} />)}</div>
            {news.length > limit && <button className="btn" style={{ margin: '8px 0' }} onClick={() => setLimit((x) => x + 60)}>{t('showAll', { n: news.length })}</button>}
          </div>
        </>
      )}
    </Panel>
  );
}

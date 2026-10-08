import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import type { Bulletin, NewsCluster, State } from '../types';
import { fmtEventDate, hostLabel, relTime } from '../lib/format';
import { Section, Sk } from './ui/Misc';
import { SourceTypeBadge, InfoTip } from './ui/Badges';
import { StackedBars } from './ui/Charts';
import { Citations } from './Citations';

const TOPICS = ['second-case', 'who', 'diplomacy', 'quarantine', 'pharmacy', 'border', 'denial'];

function Statement({ b, state, now }: { b: Bulletin; state: State; now: number }) {
  const { t, l, lang } = useI18n();
  const title = b.auto ? b.title.orig || b.title.en : l(b.title);
  return (
    <article className="item">
      <div className="item-meta">
        <span className="who">{l(b.issuer)}</span>
        <SourceTypeBadge type={b.sourceType} />
        <span>{b.auto ? relTime(b.t, lang, now) : fmtEventDate(b.t, lang, 'day')}</span>
        {b.auto && <span>· {t('autoCollected')}</span>}
      </div>
      {b.url ? <a className="item-title" href={b.url} target="_blank" rel="noopener noreferrer">{title}</a> : <div className="item-title">{title}</div>}
      {b.auto && b.summary && <p>{b.summary}</p>}
      {b.points.length > 0 && <ul>{b.points.map((p, i) => <li key={i}>{l(p)}</li>)}</ul>}
      {b.sources.length > 0 && (
        <div>
          {b.via && <span className="faint small">{t('via')}</span>}
          <Citations ids={b.sources} citations={state.citations} max={3} />
        </div>
      )}
    </article>
  );
}

function Story({ n, now, isNew }: { n: NewsCluster; now: number; isNew: boolean }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <article className="item" style={isNew ? { background: 'linear-gradient(90deg, var(--mark), transparent 60%)' } : undefined}>
      <div className="item-meta">
        <span className="who">{n.publisher || hostLabel(n.host)}</span>
        <SourceTypeBadge type={n.sourceType} />
        <span>{relTime(n.t, lang, now)}</span>
        {n.lang !== lang && <span>{n.lang.toUpperCase()}</span>}
      </div>
      <a className="item-title" href={n.url} target="_blank" rel="noopener noreferrer">{n.title}</a>
      {n.also.length > 0 && (
        <div className="also">
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open}>{t('alsoCovered', { n: n.also.length })} {open ? '−' : '+'}</button>
          {!open && <span>: {n.also.slice(0, 3).map((a) => a.publisher || hostLabel(a.host)).join(', ')}{n.also.length > 3 ? '…' : ''}</span>}
          {open && (
            <ul className="also-list">
              {n.also.map((a) => <li key={a.id}><a href={a.url} target="_blank" rel="noopener noreferrer"><b>{a.publisher || hostLabel(a.host)}</b><span>{a.title}</span></a></li>)}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

export function Feed({ state, now, seen }: { state: State | null; now: number; seen: Set<string> }) {
  const { t, lang } = useI18n();
  const [langF, setLangF] = useState<'all' | 'zh' | 'en' | 'ru'>('all');
  const [topic, setTopic] = useState('all');
  const [hideCaution, setHideCaution] = useState(false);
  const [limit, setLimit] = useState(30);
  const [bLimit, setBLimit] = useState(8);

  const news = useMemo(() => (state?.news || []).filter((n) =>
    (langF === 'all' || n.lang === langF) && (topic === 'all' || n.topics.includes(topic)) && (!hideCaution || n.sourceType !== 'caution')), [state, langF, topic, hideCaution]);
  const newCount = state && seen.size ? state.news.filter((n) => !seen.has(`n:${n.id}`)).length : 0;
  const tFmt = (ms: number) => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'short', day: 'numeric' }).format(ms);

  return (
    <Section id="feed" title={t('feedTitle')}>
      {!state ? <Sk h={300} /> : (
        <div className="cols even">
          <div>
            <h3 className="sub-head">{t('tabOfficial')}<span className="count">{state.bulletins.length}</span></h3>
            {state.bulletins.slice(0, bLimit).map((b) => <Statement key={b.id} b={b} state={state} now={now} />)}
            {state.bulletins.length > bLimit && <button className="more" onClick={() => setBLimit(999)}>{t('showAll', { n: state.bulletins.length })}</button>}
          </div>
          <div>
            <h3 className="sub-head">{t('tabNews')}<span className="count">{state.news.length}</span></h3>
            <div className="vol">
              <div className="vol-cap"><span>{t('volume7d')} <InfoTip body={t('volumeNote')} /></span></div>
              <StackedBars
                data={state.newsVolume}
                keys={[
                  { key: 'official', label: `${t('st_official')} / ${t('st_intl')}`, color: 'var(--series-3)' },
                  { key: 'media', label: t('st_media'), color: 'var(--series-1)' },
                  { key: 'caution', label: t('st_caution'), color: 'var(--series-2)' },
                ]}
                height={64}
                tFormat={tFmt}
                ariaLabel={t('volume7d')}
              />
              <div className="legend" style={{ marginTop: 6 }}>
                <span><i style={{ background: 'var(--series-3)' }} />{t('st_official')} / {t('st_intl')}</span>
                <span><i style={{ background: 'var(--series-1)' }} />{t('st_media')}</span>
                <span><i style={{ background: 'var(--series-2)' }} />{t('st_caution')}</span>
              </div>
            </div>
            <div className="filters">
              <select className="select" value={langF} onChange={(e) => setLangF(e.target.value as typeof langF)} aria-label={t('allLanguages')}>
                <option value="all">{t('allLanguages')}</option><option value="zh">中文</option><option value="en">English</option><option value="ru">Русский</option>
              </select>
              <select className="select" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label={t('filterAll')}>
                <option value="all">{t('filterAll')}</option>
                {TOPICS.map((tp) => <option key={tp} value={tp}>{t(`topic_${tp}`)}</option>)}
              </select>
              <label className="check"><input type="checkbox" checked={hideCaution} onChange={(e) => setHideCaution(e.target.checked)} />{t('hideCaution')}</label>
            </div>
            <div className="feed-scroll">
              {newCount > 0 && <div className="newbar">{t('newItems', { n: newCount })}</div>}
              {!news.length && <p className="muted">{t('noResults')}</p>}
              {news.slice(0, limit).map((n) => <Story key={n.id} n={n} now={now} isNew={seen.size > 0 && !seen.has(`n:${n.id}`)} />)}
              {news.length > limit && <button className="more" onClick={() => setLimit((x) => x + 50)}>{t('showAll', { n: news.length })}</button>}
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

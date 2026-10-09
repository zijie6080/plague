import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import type { Bulletin, NewsCluster, State } from '../types';
import { fmtEventDate, hostLabel, relTime } from '../lib/format';
import { Section } from './ui/Misc';
import { SourceTypeBadge, InfoTip } from './ui/Badges';
import { Sheet } from './ui/Sheet';
import { StackedBars } from './ui/Charts';
import { Citations } from './Citations';

const TOPICS = ['second-case', 'who', 'diplomacy', 'quarantine', 'pharmacy', 'border', 'denial'];

function Story({ n, now, rank }: { n: NewsCluster; now: number; rank?: number }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <li className="story">
      {rank != null && <span className="rank">{rank}</span>}
      <div>
        <a className="story-title" href={n.url} target="_blank" rel="noopener noreferrer">{n.title}</a>
        <div className="story-meta">
          <span className="who">{n.publisher || hostLabel(n.host)}</span>
          <SourceTypeBadge type={n.sourceType} />
          <span>{relTime(n.t, lang, now)}</span>
          {n.also.length > 0 && <button className="outlets" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{t('outletsN', { n: (n.outlets ?? n.also.length + 1) })} {open ? '−' : '+'}</button>}
        </div>
        {open && (
          <ul className="also-list">
            {n.also.map((a) => <li key={a.id}><a href={a.url} target="_blank" rel="noopener noreferrer"><b>{a.publisher || hostLabel(a.host)}</b><span>{a.title}</span></a></li>)}
          </ul>
        )}
      </div>
    </li>
  );
}

function Statement({ b, state, now }: { b: Bulletin; state: State; now: number }) {
  const { t, l, lang } = useI18n();
  const title = b.auto ? b.title.orig || b.title.en : l(b.title);
  return (
    <li className="stmt">
      <div className="stmt-meta"><b>{l(b.issuer)}</b><span>{b.auto ? relTime(b.t, lang, now) : fmtEventDate(b.t, lang, 'day')}</span>{b.auto && <span>· {t('autoCollected')}</span>}</div>
      {b.url ? <a className="stmt-title" href={b.url} target="_blank" rel="noopener noreferrer">{title}</a> : <div className="stmt-title">{title}</div>}
      {b.points.length > 0 && <ul>{b.points.slice(0, 3).map((p, i) => <li key={i}>{l(p)}</li>)}</ul>}
      {b.sources.length > 0 && <Citations ids={b.sources} citations={state.citations} max={2} />}
    </li>
  );
}

function Archive({ state, now }: { state: State; now: number }) {
  const { t, lang } = useI18n();
  const [langF, setLangF] = useState<'all' | 'zh' | 'en' | 'ru'>('all');
  const [topic, setTopic] = useState('all');
  const [hideCaution, setHideCaution] = useState(true);
  const [limit, setLimit] = useState(40);
  const list = useMemo(() => state.news.filter((n) => (langF === 'all' || n.lang === langF) && (topic === 'all' || n.topics.includes(topic)) && (!hideCaution || n.sourceType !== 'caution')), [state.news, langF, topic, hideCaution]);
  const tFmt = (ms: number) => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'short', day: 'numeric' }).format(ms);
  return (
    <>
      <section>
        <div className="lbl">{t('volume7d')} <InfoTip body={t('volumeNote')} /></div>
        <StackedBars data={state.newsVolume} height={56} tFormat={tFmt} ariaLabel={t('volume7d')} keys={[
          { key: 'official', label: `${t('st_official')} / ${t('st_intl')}`, color: 'var(--series-3)' },
          { key: 'media', label: t('st_media'), color: 'var(--series-1)' },
          { key: 'caution', label: t('st_caution'), color: 'var(--series-2)' },
        ]} />
      </section>
      <section className="filters">
        <select className="select" value={langF} onChange={(e) => setLangF(e.target.value as typeof langF)} aria-label={t('allLanguages')}>
          <option value="all">{t('allLanguages')}</option><option value="zh">中文</option><option value="en">English</option><option value="ru">Русский</option>
        </select>
        <select className="select" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label={t('filterAll')}>
          <option value="all">{t('filterAll')}</option>
          {TOPICS.map((tp) => <option key={tp} value={tp}>{t(`topic_${tp}`)}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={hideCaution} onChange={(e) => setHideCaution(e.target.checked)} />{t('hideCaution')}</label>
      </section>
      <ul className="stories">{list.slice(0, limit).map((n) => <Story key={n.id} n={n} now={now} />)}</ul>
      {list.length > limit && <button className="more" onClick={() => setLimit((x) => x + 60)}>{t('showAll', { n: list.length })}</button>}
    </>
  );
}

export function Coverage({ state, now }: { state: State; now: number }) {
  const { t } = useI18n();
  const [archive, setArchive] = useState(false);
  const [allStatements, setAllStatements] = useState(false);
  const top = useMemo(() => [...state.news].filter((n) => n.sourceType !== 'caution' && now - Date.parse(n.t) < 96 * 3_600_000).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 8), [state.news, now]);
  return (
    <Section id="feed" title={t('coverageTitle')} sub={t('coverageSub')}>
      <div className="cols wide-left">
        <div>
          <h3 className="sub-head">{t('topStories')}<InfoTip body={t('topStoriesHelp')} /></h3>
          <ol className="stories">{top.map((n, i) => <Story key={n.id} n={n} now={now} rank={i + 1} />)}</ol>
          <button className="btn" onClick={() => setArchive(true)}>{t('allCoverage', { n: state.news.length })}</button>
        </div>
        <div>
          <h3 className="sub-head">{t('tabOfficial')}</h3>
          <ul className="stmts">{state.bulletins.slice(0, allStatements ? 99 : 5).map((b) => <Statement key={b.id} b={b} state={state} now={now} />)}</ul>
          {state.bulletins.length > 5 && <button className="more" onClick={() => setAllStatements((x) => !x)}>{allStatements ? t('showLess') : t('showAll', { n: state.bulletins.length })}</button>}
        </div>
      </div>
      <Sheet open={archive} onClose={() => setArchive(false)} eyebrow={t('coverageTitle')} title={t('allCoverageTitle')}>
        <Archive state={state} now={now} />
      </Sheet>
    </Section>
  );
}

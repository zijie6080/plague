import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import type { State, Tier, TimelineEvent } from '../types';
import { fmtDayHeading, fmtDayKey, fmtEventDate } from '../lib/format';
import { toast } from '../lib/toast';
import { Section, Sk } from './ui/Misc';
import { TierBadge } from './ui/Badges';
import { Sheet } from './ui/Sheet';
import { Citations } from './Citations';
import { useUI } from './ui-context';

const TIERS: Tier[] = ['confirmed', 'suspected', 'reported', 'unverified', 'disputed'];

const timeOf = (iso: string, lang: string, precision: 'day' | 'time') =>
  precision === 'day' ? '—' : new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', { timeZone: 'Asia/Irkutsk', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

function Event({ e, state, isNew, defaultOpen }: { e: TimelineEvent; state: State; isNew: boolean; defaultOpen: boolean }) {
  const { t, l, lang } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  const place = e.locations.map((id) => state.locations.find((x) => x.id === id)).find(Boolean);
  return (
    <article className={`ev${isNew ? ' new' : ''}`} data-imp={e.importance} id={`ev-${e.id}`}>
      <div>
        <div className="ev-meta">
          {e.precision === 'time' && <span>{timeOf(e.t, lang, e.precision)}</span>}
          <TierBadge tier={e.tier} />
          <span>{t(`cat_${e.category}`)}</span>
          {place && <span>{l(place.short || place.name)}</span>}
        </div>
        <h3><button onClick={() => setOpen((o) => !o)} aria-expanded={open}>{l(e.title)}</button></h3>
        {open && <><p>{l(e.summary)}</p><Citations ids={e.sources} citations={state.citations} /></>}
        {!open && <button className="ev-toggle" onClick={() => setOpen(true)}>{t('showMore')} · {e.sources.length} {t('sources')}</button>}
      </div>
    </article>
  );
}

export function Timeline({ state, seen, bare }: { state: State | null; seen: Set<string>; bare?: boolean }) {
  const { t, lang } = useI18n();
  const [tier, setTier] = useState<Tier | 'all'>('all');
  const [cat, setCat] = useState('all');
  const [keyOnly, setKeyOnly] = useState(false);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(12);

  const cats = useMemo(() => [...new Set((state?.events || []).map((e) => e.category))], [state]);
  const filtered = useMemo(() => {
    if (!state) return [];
    const needle = q.trim().toLowerCase();
    return state.events.filter((e) => (tier === 'all' || e.tier === tier) && (cat === 'all' || e.category === cat) && (!keyOnly || e.importance >= 3) &&
      (!needle || `${e.title.zh} ${e.title.en} ${e.summary.zh} ${e.summary.en}`.toLowerCase().includes(needle)));
  }, [state, tier, cat, keyOnly, q]);
  const shown = filtered.slice(0, limit);
  const days: { key: string; t: string; items: TimelineEvent[] }[] = [];
  for (const e of shown) {
    const k = fmtDayKey(e.t);
    const d = days.find((x) => x.key === k);
    if (d) d.items.push(e); else days.push({ key: k, t: e.t, items: [e] });
  }

  const content = (
    <>
      <div className="filters">
        <button className="flt" aria-pressed={tier === 'all'} onClick={() => setTier('all')}>{t('filterAll')}</button>
        {TIERS.map((x) => <button key={x} className="flt" aria-pressed={tier === x} onClick={() => setTier(tier === x ? 'all' : x)}><TierBadge tier={x} noTip /></button>)}
      </div>
      <div className="filters">
        <select className="select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t('filterAll')}>
          <option value="all">{t('filterAll')}</option>
          {cats.map((c) => <option key={c} value={c}>{t(`cat_${c}`)}</option>)}
        </select>
        <input className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('search')} />
        <label className="check"><input type="checkbox" checked={keyOnly} onChange={(e) => setKeyOnly(e.target.checked)} />{t('keyOnly')}</label>
      </div>
      {!state && Array.from({ length: 4 }, (_, i) => <div key={i} style={{ padding: '14px 0' }}><Sk w={140} /><Sk h={18} style={{ marginTop: 8 }} /></div>)}
      {state && !filtered.length && <p className="muted">{t('noResults')}</p>}
      {days.map((d, di) => (
        <div className="tl-day" key={d.key}>
          <div className="tl-date">{fmtDayHeading(d.t, lang)}<span>{d.key}</span></div>
          {d.items.map((e) => <Event key={e.id} e={e} state={state!} isNew={seen.size > 0 && !seen.has(`ev:${e.id}`)} defaultOpen={di === 0 && e.importance === 3} />)}
        </div>
      ))}
      {filtered.length > limit && <button className="more" onClick={() => setLimit(999)}>{t('showAll', { n: filtered.length })}</button>}
    </>
  );
  if (bare) return <div className="tl-bare">{content}</div>;
  return (
    <Section id="timeline" title={t('timelineTitle')} sub={state ? `${state.events.length} · ${t('irkutskTime')} (UTC+8)` : undefined}>
      {content}
    </Section>
  );
}

export function EventSheet({ state, id, onClose }: { state: State; id: string | null; onClose: () => void }) {
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  const e = state.events.find((x) => x.id === id);
  const copy = () => navigator.clipboard?.writeText(`${location.origin}${location.pathname}#event=${id}`).then(() => toast({ title: t('copied'), tone: 'ok' }, 2200));
  return (
    <Sheet open={!!e} onClose={onClose} eyebrow={e ? `${fmtEventDate(e.t, lang, e.precision)} · ${t(`cat_${e.category}`)}` : null} title={e ? l(e.title) : ''}>
      {e && (
        <>
          <section><TierBadge tier={e.tier} /><div className="faint small" style={{ marginTop: 2 }}>{t(`tierHelp_${e.tier}`)}</div></section>
          <section><p style={{ margin: 0 }}>{l(e.summary)}</p></section>
          {e.locations.length > 0 && (
            <section>
              <div className="lbl">{t('mapTitle')}</div>
              {e.locations.map((lid) => state.locations.find((x) => x.id === lid)).filter(Boolean).map((p) => (
                <div key={p!.id}><a className="link" href="#map" onClick={() => { onClose(); open({ kind: 'location', id: p!.id }); }}>{l(p!.name)}</a></div>
              ))}
            </section>
          )}
          <section>
            <div className="lbl">{t('sources')}</div>
            {e.sources.map((sid) => state.citations[sid]).filter(Boolean).map((c) => (
              <div key={c.url + c.publisher} style={{ padding: '8px 0', borderTop: '1px solid var(--rule)' }}>
                <a className="link" href={c.url} target="_blank" rel="noopener noreferrer">{c.publisher}</a> <span className="faint small">{c.date}</span>
                <div className="muted small">{c.urlPrecision === 'search' ? `${c.title} (${t('searchLink')})` : c.title}</div>
              </div>
            ))}
          </section>
          <section><button className="btn" onClick={copy}>{t('copyLink')}</button></section>
        </>
      )}
    </Sheet>
  );
}

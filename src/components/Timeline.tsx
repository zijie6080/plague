import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import type { State, Tier, TimelineEvent } from '../types';
import { fmtDayHeading, fmtDayKey, fmtEventDate } from '../lib/format';
import { toast } from '../lib/toast';
import { Panel, Sk } from './ui/Misc';
import { TierBadge } from './ui/Badges';
import { Icon } from './ui/Icon';
import { Sheet } from './ui/Sheet';
import { Citations } from './Citations';
import { useUI } from './ui-context';

const TIERS: Tier[] = ['confirmed', 'suspected', 'reported', 'unverified', 'disputed'];

function TimelineItem({ e, state, isNew, defaultOpen }: { e: TimelineEvent; state: State; isNew: boolean; defaultOpen: boolean }) {
  const { t, l, lang } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  const places = e.locations.map((id) => state.locations.find((x) => x.id === id)).filter(Boolean);
  return (
    <article className={`tl-item${isNew ? ' new' : ''}`} data-imp={e.importance} id={`ev-${e.id}`}>
      <span className="tl-node" data-tier={e.tier} />
      <div className="tl-meta">
        <span className="t">{fmtEventDate(e.t, lang, e.precision)}</span>
        <TierBadge tier={e.tier} small />
        <span className="tl-cat">{t(`cat_${e.category}`)}</span>
        {places.slice(0, 2).map((p) => <span key={p!.id} className="faint" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="target" size={11} />{l(p!.name).split('（')[0].split(' (')[0]}</span>)}
      </div>
      <button className="tl-title" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{l(e.title)}</button>
      {open && (
        <>
          <p className="tl-summary">{l(e.summary)}</p>
          <Citations ids={e.sources} citations={state.citations} />
        </>
      )}
      <button className="tl-expand" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="chevronDown" size={13} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
        {open ? t('showLess') : `${t('showMore')} · ${e.sources.length} ${t('sources').toLowerCase()}`}
      </button>
    </article>
  );
}

export function Timeline({ state, seen }: { state: State | null; seen: Set<string> }) {
  const { t, lang } = useI18n();
  const [tiers, setTiers] = useState<Set<Tier>>(new Set(TIERS));
  const [cat, setCat] = useState<string>('all');
  const [keyOnly, setKeyOnly] = useState(false);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(14);

  const cats = useMemo(() => [...new Set((state?.events || []).map((e) => e.category))], [state]);
  const filtered = useMemo(() => {
    if (!state) return [];
    const needle = q.trim().toLowerCase();
    return state.events.filter((e) =>
      tiers.has(e.tier) && (cat === 'all' || e.category === cat) && (!keyOnly || e.importance >= 3) &&
      (!needle || `${e.title.zh} ${e.title.en} ${e.summary.zh} ${e.summary.en}`.toLowerCase().includes(needle)));
  }, [state, tiers, cat, keyOnly, q]);

  const shown = filtered.slice(0, limit);
  const days: { key: string; t: string; items: TimelineEvent[] }[] = [];
  for (const e of shown) {
    const k = fmtDayKey(e.t);
    const d = days.find((x) => x.key === k);
    if (d) d.items.push(e);
    else days.push({ key: k, t: e.t, items: [e] });
  }

  const toggleTier = (tier: Tier) => setTiers((s) => {
    const n = new Set(s);
    if (n.has(tier) && n.size === TIERS.length) return new Set([tier]); // first click isolates
    if (n.has(tier)) n.delete(tier); else n.add(tier);
    return n.size ? n : new Set(TIERS);
  });

  return (
    <Panel
      id="timeline"
      eyebrow={<><Icon name="list" size={13} />{t('navTimeline')}</>}
      title={t('timelineTitle')}
      sub={state ? `${state.events.length} · ${t('irkutskTime')} (UTC+8)` : undefined}
    >
      <div className="tl-toolbar">
        <span className="inputwrap" style={{ flex: '1 1 200px' }}>
          <Icon name="search" size={14} />
          <input className="input" style={{ width: '100%' }} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('search')} />
        </span>
        <label className="toggle"><input type="checkbox" checked={keyOnly} onChange={(e) => setKeyOnly(e.target.checked)} />{t('keyOnly')}</label>
      </div>
      <div className="chips scroll" style={{ margin: '8px 0 4px' }}>
        {TIERS.map((tier) => (
          <button key={tier} className="chip" aria-pressed={tiers.has(tier) && tiers.size < TIERS.length} onClick={() => toggleTier(tier)}>
            <span className="sw" style={{ background: `var(--t-${tier})`, opacity: tiers.has(tier) ? 1 : 0.3 }} />{t(`tier_${tier}`)}
          </button>
        ))}
      </div>
      <div className="chips scroll" style={{ margin: '0 0 6px' }}>
        <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>{t('filterAll')}</button>
        {cats.map((c) => <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(cat === c ? 'all' : c)}>{t(`cat_${c}`)}</button>)}
      </div>

      <div className="tl-scroll">
        {!state && Array.from({ length: 5 }, (_, i) => <div key={i} style={{ padding: '12px 0' }}><Sk w={120} h={10} /><Sk w="85%" h={14} style={{ marginTop: 8 }} /></div>)}
        {state && !filtered.length && <p className="muted">{t('noResults')}</p>}
        {days.map((d) => (
          <div className="tl-day" key={d.key}>
            <div className="tl-dayhead">{fmtDayHeading(d.t, lang)}<span className="d">{d.key}</span></div>
            <div className="tl-items">
              {d.items.map((e) => <TimelineItem key={e.id} e={e} state={state!} isNew={seen.size > 0 && !seen.has(`ev:${e.id}`)} defaultOpen={e.importance === 3 && d === days[0]} />)}
            </div>
          </div>
        ))}
        {filtered.length > limit && (
          <button className="btn" style={{ marginTop: 10 }} onClick={() => setLimit(999)}>{t('showAll', { n: filtered.length })}</button>
        )}
      </div>
    </Panel>
  );
}

export function EventSheet({ state, id, onClose }: { state: State; id: string | null; onClose: () => void }) {
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  const e = state.events.find((x) => x.id === id);
  const copy = () => {
    const url = `${location.origin}${location.pathname}#event=${id}`;
    navigator.clipboard?.writeText(url).then(() => toast({ title: t('copied'), tone: 'ok' }, 2200));
  };
  return (
    <Sheet open={!!e} onClose={onClose} eyebrow={e ? <>{fmtEventDate(e.t, lang, e.precision)} · {t(`cat_${e.category}`)}</> : null} title={e ? l(e.title) : ''}>
      {e && (
        <>
          <section style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <TierBadge tier={e.tier} />
            <span className="faint" style={{ fontSize: 12.5 }}>{t(`tierHelp_${e.tier}`)}</span>
          </section>
          <section><p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--text)' }}>{l(e.summary)}</p></section>
          {e.locations.length > 0 && (
            <section>
              <div className="sec-label">{t('mapTitle')}</div>
              <div className="chips">
                {e.locations.map((lid) => state.locations.find((x) => x.id === lid)).filter(Boolean).map((p) => (
                  <a key={p!.id} className="chip" href="#map" onClick={() => { onClose(); open({ kind: 'location', id: p!.id }); }}><Icon name="target" size={12} />{l(p!.name)}</a>
                ))}
              </div>
            </section>
          )}
          <section>
            <div className="sec-label">{t('sources')}</div>
            <div className="stack" style={{ gap: 6 }}>
              {e.sources.map((sid) => state.citations[sid]).filter(Boolean).map((c) => (
                <a key={c.url + c.publisher} href={c.url} target="_blank" rel="noopener noreferrer" className="srcpill" style={{ padding: '8px 10px', alignItems: 'flex-start' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span className="pub">{c.publisher} <span className="faint" style={{ fontWeight: 400 }}>· {c.date}</span></span>
                    <span style={{ color: 'var(--text-2)', whiteSpace: 'normal' }}>{c.urlPrecision === 'search' ? `${c.title} (${t('searchLink')})` : c.title}</span>
                  </span>
                  <Icon name="arrowUpRight" size={12} style={{ flex: 'none', marginTop: 2 }} />
                </a>
              ))}
            </div>
          </section>
          <section><button className="btn" onClick={copy}><Icon name="link" size={14} />{t('copyLink')}</button></section>
        </>
      )}
    </Sheet>
  );
}

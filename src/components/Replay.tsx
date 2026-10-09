import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import type { Metric, State, Tier, TimelineEvent } from '../types';
import { fmtDayKey, fmtNum } from '../lib/format';
import { Section, Tabs } from './ui/Misc';
import { TierMark } from './ui/Badges';
import { Citations } from './Citations';
import { MapView, type MapMode } from './MapView';
import { Timeline } from './Timeline';

const DAY = 86_400_000;
const endOf = (key: string) => Date.parse(`${key}T23:59:59+08:00`);
const TIER_RANK: Record<Tier, number> = { confirmed: 0, suspected: 1, reported: 2, disputed: 3, unverified: 4 };
export const REPLAY_METRICS = ['deaths', 'lab_confirmed', 'observation', 'tests'];

/** Value of a metric as known at time `ts`: official figure first, otherwise the latest reported one. */
export function valueAsOf(m: Metric, ts: number) {
  const known = m.history.filter((h) => Date.parse(h.t) <= ts && h.value != null && !h.delta);
  const pick = (tier: Tier) => known.filter((h) => h.tier === tier).at(-1);
  return pick('confirmed') || pick('reported') || pick('suspected') || null;
}

function dayLabel(key: string, lang: string, style: 'short' | 'long') {
  const d = new Date(`${key}T12:00:00+08:00`);
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', style === 'short' ? { day: 'numeric', timeZone: 'Asia/Irkutsk' } : { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Irkutsk' }).format(d);
}

export function Replay({ state, themeKey, seen, now }: { state: State; themeKey: string; seen: Set<string>; now: number }) {
  const { t, l, lang } = useI18n();
  const [view, setView] = useState<'replay' | 'list'>('replay');
  const days = useMemo(() => {
    const out: { key: string; events: TimelineEvent[] }[] = [];
    const start = Date.parse(`${state.event.start}T12:00:00+08:00`);
    const todayKey = fmtDayKey(new Date(now).toISOString());
    for (let ts = start; ; ts += DAY) {
      const key = fmtDayKey(new Date(ts).toISOString());
      out.push({ key, events: state.events.filter((e) => fmtDayKey(e.t) === key).sort((a, b) => b.importance - a.importance || TIER_RANK[a.tier] - TIER_RANK[b.tier]) });
      if (key >= todayKey || out.length > 120) break;
    }
    return out;
  }, [state.events, state.event.start, now]);
  const lastWithEvents = [...days].reverse().find((d) => d.events.length)?.key || days.at(-1)!.key;
  const [day, setDay] = useState(lastWithEvents);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<MapMode>('local');
  const [modeTouched, setModeTouched] = useState(false);
  const [place, setPlace] = useState<string | null>(null);
  const axis = useRef<HTMLDivElement>(null);

  const idx = Math.max(0, days.findIndex((d) => d.key === day));
  const cur = days[idx];
  const highlight = useMemo(() => new Set(cur.events.flatMap((e) => e.locations)), [cur]);

  // Follow the story: zoom out when the day's events happen beyond Irkutsk.
  useEffect(() => {
    if (modeTouched) return;
    const scales = [...highlight].map((id) => state.locations.find((x) => x.id === id)?.scale);
    if (scales.length) setMode(scales.includes('local') ? 'local' : 'country');
  }, [highlight, modeTouched, state.locations]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setDay((k) => {
        const i = days.findIndex((d) => d.key === k);
        if (i >= days.length - 1) { setPlaying(false); return k; }
        return days[i + 1].key;
      });
    }, 1400);
    return () => clearInterval(id);
  }, [playing, days]);

  useEffect(() => {
    // Scroll only the axis, never the page.
    const ax = axis.current;
    const cell = ax?.querySelector<HTMLElement>(`[data-day="${day}"]`);
    if (ax && cell) ax.scrollTo({ left: cell.offsetLeft - ax.clientWidth / 2 + cell.clientWidth / 2, behavior: 'smooth' });
  }, [day]);

  const step = (d: number) => { setPlaying(false); setPlace(null); setDay(days[Math.min(days.length - 1, Math.max(0, idx + d))].key); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
  };
  const metrics = REPLAY_METRICS.map((id) => state.metrics.find((m) => m.id === id)).filter(Boolean) as Metric[];
  const prevKey = days[idx - 1]?.key;

  return (
    <Section
      id="timeline"
      title={t('replayTitle')}
      sub={t('replaySub')}
      tools={<Tabs value={view} onChange={setView} options={[{ value: 'replay', label: t('replayView') }, { value: 'list', label: t('listView') }]} />}
    >
      {view === 'list' ? <Timeline state={state} seen={seen} bare /> : (
        <div className="replay">
          <div className="rp-controls">
            <button className="rp-btn" onClick={() => step(-1)} aria-label={t('prevDay')} disabled={idx === 0}>‹</button>
            <button className="rp-btn play" onClick={() => { if (idx >= days.length - 1) setDay(days[0].key); setPlaying((p) => !p); }} aria-label={playing ? t('pause') : t('play')}>{playing ? '❚❚' : '▶'}</button>
            <button className="rp-btn" onClick={() => step(1)} aria-label={t('nextDay')} disabled={idx === days.length - 1}>›</button>
            <span className="rp-hint">{t('replayHint')}</span>
          </div>
          <div className="rp-axis" ref={axis} role="listbox" aria-label={t('replayTitle')} tabIndex={0} onKeyDown={onKey}>
            {days.map((d, i) => {
              const showMonth = i === 0 || d.key.slice(5, 7) !== days[i - 1].key.slice(5, 7);
              return (
                <button key={d.key} data-day={d.key} role="option" aria-selected={d.key === day} className={`rp-day${d.events.length ? '' : ' empty'}${d.key === day ? ' on' : ''}`}
                  onClick={() => { setPlaying(false); setPlace(null); setDay(d.key); }}
                  title={d.events.length ? `${d.events.length} · ${l(d.events[0].title)}` : ''}>
                  <span className="m">{showMonth ? new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'short', timeZone: 'Asia/Irkutsk' }).format(new Date(`${d.key}T12:00:00+08:00`)) : ''}</span>
                  <span className="dots">{d.events.slice(0, 5).map((e) => <i key={e.id} style={{ ['--c' as string]: `var(--t-${e.tier})` }} className={e.importance === 3 ? 'big' : ''} />)}</span>
                  <span className="d">{dayLabel(d.key, lang, 'short')}</span>
                </button>
              );
            })}
          </div>

          <div className="rp-body">
            <div className="rp-mapcol">
              <MapView state={state} themeKey={themeKey} mode={mode} highlight={highlight} selected={place} onSelect={setPlace} />
              <div className="rp-mapbar">
                <Tabs value={mode} onChange={(v) => { setModeTouched(true); setMode(v); }} options={[{ value: 'local', label: t('mapLocal') }, { value: 'country', label: t('mapCountry') }]} />
                <span className="faint small">{t('mapHint')}</span>
              </div>
            </div>
            <div className="rp-day-panel" key={day}>
              <div className="rp-date">
                <span className="faint">{t('dayN', { n: idx + 1 })}</span>
                <h3>{dayLabel(day, lang, 'long')}</h3>
              </div>
              <dl className="rp-figs">
                {metrics.map((m) => {
                  const v = valueAsOf(m, endOf(day));
                  const before = prevKey ? valueAsOf(m, endOf(prevKey)) : null;
                  const changed = v && before && v.value !== before.value;
                  return (
                    <div key={m.id} className={changed ? 'changed' : ''}>
                      <dt>{l(m.label)}</dt>
                      <dd>{v ? <>{v.approx ? '~' : ''}{fmtNum(v.value!, lang)}{v.tier !== 'confirmed' && <TierMark tier={v.tier} />}</> : '—'}</dd>
                    </div>
                  );
                })}
              </dl>
              {!cur.events.length && <p className="muted">{t('quietDay')}</p>}
              <ol className="rp-events">
                {cur.events.map((e) => (
                  <li key={e.id} data-imp={e.importance}>
                    <div className="rp-ev-head"><TierMark tier={e.tier} withLabel /><span className="faint">{t(`cat_${e.category}`)}</span></div>
                    <h4>{l(e.title)}</h4>
                    <p>{l(e.summary)}</p>
                    <Citations ids={e.sources} citations={state.citations} max={3} />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

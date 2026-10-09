import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext, detectLang, translate } from './i18n';
import type { Lang, State } from './types';
import { useData, useNow } from './lib/useData';
import { toast } from './lib/toast';
import { TopBar, TabBar, useActiveSection, type ThemePref } from './components/TopBar';
import { Hero } from './components/Hero';
import { Replay } from './components/Replay';
import { Claims } from './components/Claims';
import { Coverage } from './components/Coverage';
import { MetricSheet } from './components/Metrics';
import { EventSheet } from './components/Timeline';
import { Pharma } from './components/Pharma';
import { Signals, SignalSheet } from './components/Signals';
import { SourcesPanel } from './components/SourcesPanel';
import { Method } from './components/Method';
import { Toasts } from './components/ui/Toasts';
import { UIContext, type Focus } from './components/ui-context';

const SEEN_KEY = 'sentinel.seen.v1';

function readSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); }
}
function idsOf(s: State) {
  return [...s.events.map((e) => `ev:${e.id}`), ...s.news.map((n) => `n:${n.id}`), ...s.anomalies.active.map((a) => `sig:${a.id}`)];
}

function readTheme(): ThemePref {
  try { const v = localStorage.getItem('theme'); if (v === 'light' || v === 'dark') return v; } catch {}
  return 'system';
}

export default function App() {
  const [lang, setLangState] = useState<Lang>(detectLang);
  const [theme, setTheme] = useState<ThemePref>(readTheme);
  const [focus, setFocus] = useState<Focus>(null);
  const [seen] = useState<Set<string>>(readSeen); // ids known at the previous visit → "new since last visit"
  const now = useNow(30_000);
  const active = useActiveSection();

  const setLang = useCallback((l: Lang) => { setLangState(l); try { localStorage.setItem('lang', l); } catch {} }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === 'zh' ? '哨点 · 伊尔库茨克疑似鼠疫事件实时监测' : 'Sentinel · Irkutsk suspected plague event monitor';
  }, [lang]);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme'); else root.dataset.theme = theme;
    try { if (theme === 'system') localStorage.removeItem('theme'); else localStorage.setItem('theme', theme); } catch {}
  }, [theme]);
  const [sysDark, setSysDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = () => setSysDark(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  const themeKey = theme === 'system' ? (sysDark ? 'dark' : 'light') : theme;

  const tr = useCallback((k: string, v?: Record<string, string | number>) => translate(lang, k, v), [lang]);

  // Announce meaningful changes when fresh data arrives while the page is open.
  const onChange = useCallback((prev: State, next: State) => {
    const prevEvents = new Set(prev.events.map((e) => e.id));
    const newEvents = next.events.filter((e) => !prevEvents.has(e.id));
    const prevSig = new Set(prev.anomalies.active.map((a) => a.id));
    const newSig = next.anomalies.active.filter((a) => !prevSig.has(a.id) && a.severity !== 'info');
    const prevNews = new Set(prev.news.map((n) => n.id));
    const newNews = next.news.filter((n) => !prevNews.has(n.id)).length;
    for (const e of newEvents.slice(0, 2)) toast({ title: tr('toastNewEvent'), body: e.title[lang], tone: e.importance === 3 ? 'watch' : 'info', action: { label: tr('showMore'), onClick: () => setFocus({ kind: 'event', id: e.id }) } }, 9000);
    for (const s of newSig.slice(0, 2)) toast({ title: tr('toastNewSignal'), body: s.title[lang], tone: s.severity, action: { label: tr('showMore'), onClick: () => setFocus({ kind: 'signal', id: s.id }) } }, 9000);
    if (newNews > 0) toast({ title: tr('toastNewNews', { n: newNews }), tone: 'info' });
    if (!newEvents.length && !newSig.length && !newNews) toast({ title: tr('toastUpdated'), tone: 'ok' }, 2500);
  }, [lang, tr]);

  const { state, error, conn, reload } = useData(onChange);

  useEffect(() => {
    if (!state) return;
    const id = setTimeout(() => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(idsOf(state))); } catch {} }, 4000);
    return () => clearTimeout(id);
  }, [state]);

  const [wasOffline, setWasOffline] = useState(false);
  useEffect(() => {
    if (conn === 'offline' && !wasOffline) { setWasOffline(true); toast({ title: tr('toastOffline'), tone: 'alert' }, 4000); }
    if (conn !== 'offline' && wasOffline) { setWasOffline(false); toast({ title: tr('toastOnline'), tone: 'ok' }, 2500); }
  }, [conn, wasOffline, tr]);

  // Deep links: #event=<id>, #signal=<id>
  useEffect(() => {
    if (!state) return;
    const apply = () => {
      const m = location.hash.match(/^#(event|signal|metric)=([\w-|:.+]+)$/);
      if (m) setFocus({ kind: m[1] as 'event', id: decodeURIComponent(m[2]) });
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [!!state]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => {
    setFocus(null);
    if (/^#(event|signal|metric)=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  }, []);
  const open = useCallback((f: Focus) => {
    if (f?.kind === 'location') { document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' }); return; }
    setFocus(f);
  }, []);
  const ui = useMemo(() => ({ open, seen }), [open, seen]);
  const i18n = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  const badges = useMemo(() => ({ pharma: !!state?.anomalies.active.some((a) => a.subject.drug && a.severity !== 'info') }), [state]);

  return (
    <I18nContext.Provider value={i18n}>
      <UIContext.Provider value={ui}>
        <a className="skip" href="#overview">{tr('skipToContent')}</a>
        <TopBar conn={conn} generatedAt={state?.generatedAt} now={now} theme={theme} setTheme={setTheme} active={active} />
        <main className="wrap" id="overview">
          {error && !state && (
            <div className="banner" role="alert">{tr('loadError')}<button className="btn" onClick={() => reload().catch(() => {})}>{tr('retry')}</button></div>
          )}
          <Hero state={state} now={now} />
          {state && <Replay state={state} themeKey={themeKey} seen={seen} now={now} />}
          {state && <Claims state={state} />}
          {state && <Coverage state={state} now={now} />}
          <Pharma state={state} />
          <section className="section" id="system">
            <header className="sec-head"><div><h2>{tr('dataTitle')}</h2></div></header>
            <div className="cols even">
              <Signals state={state} now={now} />
              <SourcesPanel state={state} now={now} />
            </div>
          </section>
          <Method />
          <footer className="foot">
            <span>{tr('brand')} · {tr('brandSub')}</span>
            <span>{tr('disclaimer')}</span>
            <span>Map © OpenStreetMap · OpenFreeMap · Natural Earth</span>
          </footer>
        </main>
        <TabBar active={active} badge={badges} />
        {state && <EventSheet state={state} id={focus?.kind === 'event' ? focus.id : null} onClose={close} />}
        {state && <MetricSheet state={state} id={focus?.kind === 'metric' ? focus.id : null} onClose={close} />}
        {state && <SignalSheet state={state} id={focus?.kind === 'signal' ? focus.id : null} onClose={close} />}
        <Toasts />
      </UIContext.Provider>
    </I18nContext.Provider>
  );
}

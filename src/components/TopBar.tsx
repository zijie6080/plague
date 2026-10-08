import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import type { Conn } from '../lib/useData';
import { relTime } from '../lib/format';
import { Icon, type IconName } from './ui/Icon';

export const SECTIONS: { id: string; key: string; short?: string; icon: IconName; mobile?: boolean }[] = [
  { id: 'overview', key: 'navOverview', icon: 'home', mobile: true },
  { id: 'map', key: 'navMap', icon: 'map', mobile: true },
  { id: 'timeline', key: 'navTimeline', icon: 'list', mobile: true },
  { id: 'feed', key: 'navFeed', short: 'navFeedShort', icon: 'news', mobile: true },
  { id: 'pharma', key: 'navPharma', icon: 'pill', mobile: true },
  { id: 'signals', key: 'navSignals', icon: 'pulse' },
  { id: 'system', key: 'navSystem', icon: 'server' },
];

export function useActiveSection() {
  const [active, setActive] = useState('overview');
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: '-50px 0px -60% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
  return active;
}

export type ThemePref = 'system' | 'light' | 'dark';

export function TopBar({ conn, generatedAt, now, theme, setTheme, active }: { conn: Conn; generatedAt?: string; now: number; theme: ThemePref; setTheme: (t: ThemePref) => void; active: string }) {
  const { t, lang, setLang } = useI18n();
  const stale = generatedAt ? now - Date.parse(generatedAt) > 3 * 3600_000 : false;
  const state = conn === 'offline' ? 'offline' : stale ? 'stale' : 'ok';
  const nextTheme: ThemePref = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
  const themeIcon: IconName = theme === 'system' ? 'monitor' : theme === 'dark' ? 'moon' : 'sun';
  const themeLabel = `${t('theme')}: ${t(`theme${theme[0].toUpperCase()}${theme.slice(1)}`)}`;
  return (
    <>
      <header className="mast">
        <div className="wrap mast-row">
          <a className="wordmark" href="#overview"><b>{t('brand')}</b><span>{t('brandSub')}</span></a>
          <div className="mast-tools">
            <span className="status" data-state={state} title={generatedAt ? new Date(generatedAt).toLocaleString() : ''}>
              <i />
              <span className="label">{state === 'offline' ? t('offline') : state === 'stale' ? t('stale') : t('updated')}</span>
              {generatedAt && <span>{relTime(generatedAt, lang, now)}</span>}
            </span>
            <button className="tool" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} aria-label={t('language')}>{lang === 'zh' ? 'EN' : '中文'}</button>
            <button className="tool" onClick={() => setTheme(nextTheme)} aria-label={themeLabel} title={themeLabel}><Icon name={themeIcon} size={17} /></button>
          </div>
        </div>
      </header>
      <nav className="secnav" aria-label="Sections">
        <div className="wrap">
          {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'active' : ''}>{t(s.key)}</a>)}
        </div>
      </nav>
    </>
  );
}

export function TabBar({ active, badge }: { active: string; badge?: Record<string, boolean> }) {
  const { t } = useI18n();
  return (
    <nav className="tabbar" aria-label="Sections">
      {SECTIONS.filter((s) => s.mobile).map((s) => (
        <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'active' : ''}>
          <Icon name={s.icon} size={19} weight={1.6} />
          {t(s.short || s.key)}
          {badge?.[s.id] && <span className="badge" />}
        </a>
      ))}
    </nav>
  );
}

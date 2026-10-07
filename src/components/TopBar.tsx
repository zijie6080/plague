import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import type { Conn } from '../lib/useData';
import { relTime } from '../lib/format';
import { Icon, Logo, type IconName } from './ui/Icon';

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
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: '-64px 0px -55% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
  return active;
}

export type ThemePref = 'system' | 'light' | 'dark';

export function TopBar({ conn, generatedAt, now, theme, setTheme, active }: { conn: Conn; generatedAt?: string; now: number; theme: ThemePref; setTheme: (t: ThemePref) => void; active: string }) {
  const { t, lang, setLang } = useI18n();
  const stale = generatedAt ? now - Date.parse(generatedAt) > 3 * 3600_000 : false;
  const nextTheme: ThemePref = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
  const themeIcon: IconName = theme === 'system' ? 'monitor' : theme === 'dark' ? 'moon' : 'sun';
  const label = conn === 'offline' ? t('offline') : stale ? t('stale') : t('live');
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#overview" aria-label={t('brand')}>
          <span className="brand-mark"><Logo /></span>
          <span className="brand-name">{t('brand')}</span>
          <span className="brand-sub">{t('brandSub')}</span>
        </a>
        <nav className="nav" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'active' : ''}>{t(s.key)}</a>
          ))}
        </nav>
        <div className="topbar-right">
          <span className="live" data-conn={conn} data-stale={stale} title={generatedAt ? `${t('updated')} ${new Date(generatedAt).toLocaleString()}` : ''}>
            <span className="live-dot" />
            <span className="live-label">{label}{generatedAt && <span className="faint"> · {relTime(generatedAt, lang, now)}</span>}</span>
          </span>
          <button className="langbtn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} aria-label={t('language')} title={t('language')}>
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
          <button className="iconbtn" onClick={() => setTheme(nextTheme)} aria-label={`${t('theme')}: ${t(`theme${theme[0].toUpperCase()}${theme.slice(1)}`)}`} title={`${t('theme')}: ${t(`theme${theme[0].toUpperCase()}${theme.slice(1)}`)}`}>
            <Icon name={themeIcon} />
          </button>
        </div>
      </div>
    </header>
  );
}

export function TabBar({ active, badge }: { active: string; badge?: Record<string, boolean> }) {
  const { t } = useI18n();
  return (
    <nav className="tabbar" aria-label="Sections">
      {SECTIONS.filter((s) => s.mobile).map((s) => (
        <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'active' : ''}>
          <Icon name={s.icon} size={19} />
          {t(s.short || s.key)}
          {badge?.[s.id] && <span className="badge-dot" />}
        </a>
      ))}
    </nav>
  );
}

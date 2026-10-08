import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MLMap, Marker, StyleSpecification } from 'maplibre-gl';
import { useI18n } from '../i18n';
import type { MapLocation, State, Tier } from '../types';
import { fmtEventDate } from '../lib/format';
import { Section, Tabs } from './ui/Misc';
import { TierBadge } from './ui/Badges';
import { useUI } from './ui-context';

type Mode = 'local' | 'country';
const BASE = import.meta.env.BASE_URL;
const TIER_VAR: Record<Tier, string> = { confirmed: '--t-confirmed', suspected: '--t-suspected', reported: '--t-reported', unverified: '--t-unverified', disputed: '--t-disputed' };
const VIEWS: Record<Mode, { bounds: [[number, number], [number, number]]; maxZoom: number }> = {
  local: { bounds: [[104.03, 52.16], [104.38, 52.33]], maxZoom: 12.5 },
  country: { bounds: [[40, 38], [140, 70]], maxZoom: 5 },
};
const SQUARE = new Set(['hospital', 'quarantine', 'lab', 'site']);

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
const isDark = () => document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);

const blankStyle = (): StyleSpecification => ({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': cssVar('--paper-2') } }] });

export function MapPanel({ state, themeKey }: { state: State | null; themeKey: string }) {
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<{ m: Marker; loc: MapLocation; node: HTMLDivElement }[]>([]);
  const [mode, setMode] = useState<Mode>('local');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const lib = useRef<typeof import('maplibre-gl') | null>(null);

  const locations = useMemo(() => state?.locations || [], [state]);
  const visible = locations.filter((x) => (mode === 'local' ? x.scale === 'local' : x.scale === 'country' || x.id === 'irkutsk-city'));
  const selected = locations.find((x) => x.id === sel) || null;

  // Init map once (lazy-load MapLibre only when the panel is near the viewport).
  useEffect(() => {
    if (!el.current || !state) return;
    let cancelled = false;
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || map.current) return;
      io.disconnect();
      try {
        const [ml, worker] = await Promise.all([
          import('maplibre-gl'),
          import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
          import('maplibre-gl/dist/maplibre-gl.css'),
        ]);
        ml.setWorkerUrl(worker.default);
        if (cancelled || !el.current) return;
        lib.current = ml;
        const m = new ml.Map({
          container: el.current,
          style: isDark() ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/positron',
          bounds: VIEWS.local.bounds,
          fitBoundsOptions: { padding: 40 },
          attributionControl: { compact: true },
          cooperativeGestures: matchMedia('(pointer: coarse)').matches,
          dragRotate: false,
          pitchWithRotate: false,
        });
        m.touchZoomRotate.disableRotation();
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-left');
        map.current = m;
        const fallback = setTimeout(() => { if (!m.isStyleLoaded()) m.setStyle(blankStyle()); }, 9000);
        m.on('error', (e) => { if (!m.isStyleLoaded() && /style|fetch|tiles/i.test(String(e.error?.message))) { clearTimeout(fallback); m.setStyle(blankStyle()); } });
        m.on('style.load', () => { clearTimeout(fallback); addLayers(m); setReady(true); });
      } catch {
        setFailed(true);
      }
    }, { rootMargin: '300px' });
    io.observe(el.current);
    return () => { cancelled = true; io.disconnect(); };
  }, [!!state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);

  // Theme change → swap basemap; layers are re-added on style.load.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    m.setStyle(isDark() ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/positron');
  }, [themeKey]);

  function addLayers(m: MLMap) {
    if (!state || m.getSource('regions')) return;
    const involved = state.regions;
    const countries = state.countries;
    const regionColor: unknown[] = ['match', ['get', 'id']];
    involved.forEach((r) => regionColor.push(r.id, cssVar(TIER_VAR[r.tier])));
    regionColor.push('rgba(0,0,0,0)');
    const countryColor: unknown[] = ['match', ['get', 'id']];
    countries.forEach((c) => countryColor.push(c.id, cssVar(TIER_VAR[c.tier])));
    countryColor.push('rgba(0,0,0,0)');
    const firstSymbol = m.getStyle().layers?.find((ly) => ly.type === 'symbol')?.id;
    m.addSource('regions', { type: 'geojson', data: `${BASE}geo/russia-regions.json` });
    m.addSource('neighbors', { type: 'geojson', data: `${BASE}geo/neighbors.json` });
    m.addLayer({ id: 'nb-fill', type: 'fill', source: 'neighbors', paint: { 'fill-color': countryColor as never, 'fill-opacity': 0.12 } }, firstSymbol);
    m.addLayer({ id: 'rg-fill', type: 'fill', source: 'regions', paint: { 'fill-color': regionColor as never, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.22, 8, 0.06] } }, firstSymbol);
    m.addLayer({ id: 'rg-line', type: 'line', source: 'regions', paint: { 'line-color': cssVar('--ink-3'), 'line-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.25, 7, 0.5], 'line-width': 0.6 } }, firstSymbol);
    m.addLayer({ id: 'rg-hl', type: 'line', source: 'regions', filter: ['in', ['get', 'id'], ['literal', involved.map((r) => r.id)]], paint: { 'line-color': regionColor as never, 'line-width': 1.6 } }, firstSymbol);
    m.addLayer({ id: 'nb-hl', type: 'line', source: 'neighbors', filter: ['in', ['get', 'id'], ['literal', countries.map((c) => c.id)]], paint: { 'line-color': countryColor as never, 'line-width': 1.2, 'line-dasharray': [2, 2] } }, firstSymbol);
    // Hover tooltip for regions.
    const popup = new lib.current!.Popup({ closeButton: false, closeOnClick: false, className: 'tip', offset: 10 });
    m.on('mousemove', 'rg-fill', (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const name = (f.properties as Record<string, string>)[lang] || (f.properties as Record<string, string>).en;
      const role = involved.find((r) => r.id === (f.properties as Record<string, string>).id);
      const roleLabel = role ? t(role.role === 'epicenter' ? 'epicenter' : `loc_${role.role}`) : '';
      popup.setLngLat(e.lngLat).setHTML(`${escapeHtml(name)}${role ? ` · <span style="color:var(${TIER_VAR[role.tier]})">${escapeHtml(roleLabel)}</span>` : ''}`).addTo(m);
    });
    m.on('mouseleave', 'rg-fill', () => popup.remove());
  }

  // Markers follow mode, filters and data.
  useEffect(() => {
    const m = map.current;
    const ml = lib.current;
    if (!m || !ml || !ready) return;
    markers.current.forEach((x) => x.m.remove());
    markers.current = visible.map((loc) => {
      const node = document.createElement('div');
      const epic = mode === 'country' && loc.id === 'irkutsk-city';
      node.className = `marker${SQUARE.has(loc.type) ? ' sq' : ''}${epic || loc.type === 'lab' || loc.id === 'shelekhov-hospital' ? ' lg ring' : ''}${sel === loc.id ? ' sel' : ''}`;
      node.style.setProperty('--c', `var(${TIER_VAR[loc.tier]})`);
      node.innerHTML = '<span class="core"></span>';
      const showLabel = loc.short && (mode === 'country' ? loc.scale === 'country' || epic : loc.id !== 'irkutsk-city');
      if (showLabel) {
        const lab = document.createElement('span');
        lab.className = 'mlabel';
        lab.textContent = l(loc.short!);
        node.appendChild(lab);
      }
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');
      node.setAttribute('aria-label', l(loc.name));
      node.title = l(loc.name);
      const pick = (ev: Event) => { ev.stopPropagation(); setSel(loc.id); };
      node.addEventListener('click', pick);
      node.addEventListener('keydown', (ev) => { if ((ev as KeyboardEvent).key === 'Enter') pick(ev); });
      const mk = new ml.Marker({ element: node }).setLngLat([loc.lon, loc.lat]).addTo(m);
      return { m: mk, loc, node };
    });
  }, [ready, mode, visible.map((v) => v.id).join(), sel, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.fitBounds(VIEWS[mode].bounds, { padding: 40, maxZoom: VIEWS[mode].maxZoom, duration: 900 });
  }, [mode, ready]);

  const focus = (loc: MapLocation) => {
    setSel(loc.id);
    if (loc.scale !== mode && !(mode === 'country' && loc.id === 'irkutsk-city')) setMode(loc.scale);
    setTimeout(() => map.current?.easeTo({ center: [loc.lon, loc.lat], zoom: loc.scale === 'local' ? Math.max(map.current.getZoom(), 11) : 4, duration: 700 }), loc.scale !== mode ? 950 : 0);
  };

  const legendTiers = [...new Set(visible.map((v) => v.tier))];
  const typeOf = (loc: MapLocation) => `${t(`loc_${loc.type}`)} · ${t(`precision_${loc.precision}`)}`;

  return (
    <Section
      id="map"
      title={t('mapTitle')}
      tools={<Tabs value={mode} onChange={(v) => { setSel(null); setMode(v); }} options={[{ value: 'local', label: t('mapLocal') }, { value: 'country', label: t('mapCountry') }]} />}
    >
      <div className="map-grid">
        <div className="map-canvas">
          <div ref={el} style={{ position: 'absolute', inset: 0 }} />
          {(failed || !state) && <div className="map-fallback">{failed ? t('mapUnavailable') : <div className="sk" style={{ position: 'absolute', inset: 0 }} />}</div>}
        </div>
        <aside className="map-side">
          {selected && (
            <div className="detail" role="region" aria-label={l(selected.name)}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <TierBadge tier={selected.tier} />
                <button className="link small" style={{ marginLeft: 'auto' }} onClick={() => setSel(null)}>{t('close')}</button>
              </div>
              <h4>{l(selected.name)}</h4>
              {selected.name.ru && <div className="ru">{selected.name.ru}</div>}
              <p>{l(selected.status)}</p>
              <div className="faint small" style={{ marginTop: 6 }}>{typeOf(selected)}</div>
              {selected.events.length > 0 && (
                <div className="rel">
                  {selected.events.map((id) => state?.events.find((e) => e.id === id)).filter(Boolean).map((e) => (
                    <button key={e!.id} onClick={() => open({ kind: 'event', id: e!.id })}>{fmtEventDate(e!.t, lang, e!.precision)} · {l(e!.title)}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="head">{visible.length} · {mode === 'local' ? t('mapLocal') : t('mapCountry')}</div>
          <ul className="places">
            {visible.map((loc) => (
              <li key={loc.id}>
                <button aria-pressed={sel === loc.id} onClick={() => focus(loc)}>
                  <span className={`mk${SQUARE.has(loc.type) ? ' sq' : ''}`} style={{ ['--c' as string]: `var(${TIER_VAR[loc.tier]})` }} />
                  <span><span className="nm">{l(loc.short || loc.name)}</span><div className="sub">{t(`loc_${loc.type}`)} · {t(`tier_${loc.tier}`)}</div></span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <div className="map-legend">
        {legendTiers.map((tier) => <span key={tier}><span className="dot" style={{ ['--c' as string]: `var(${TIER_VAR[tier]})` }} />{t(`tier_${tier}`)}</span>)}
        <span className="faint">● {t('loc_city')} &nbsp;■ {t('loc_hospital')} / {t('loc_lab')}</span>
      </div>
    </Section>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

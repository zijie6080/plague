import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MLMap, Marker, StyleSpecification } from 'maplibre-gl';
import { useI18n } from '../i18n';
import type { MapLocation, State, Tier } from '../types';

export type MapMode = 'local' | 'country';
const BASE = import.meta.env.BASE_URL;
export const TIER_VAR: Record<Tier, string> = { confirmed: '--t-confirmed', suspected: '--t-suspected', reported: '--t-reported', unverified: '--t-unverified', disputed: '--t-disputed' };
const VIEWS: Record<MapMode, { bounds: [[number, number], [number, number]]; maxZoom: number }> = {
  local: { bounds: [[104.03, 52.16], [104.38, 52.33]], maxZoom: 12.5 },
  country: { bounds: [[40, 38], [140, 70]], maxZoom: 5 },
};
export const SQUARE = new Set(['hospital', 'quarantine', 'lab', 'site']);
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
const isDark = () => document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
const styleUrl = () => (isDark() ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/positron');
const blankStyle = (): StyleSpecification => ({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': cssVar('--paper-2') } }] });

/**
 * Controlled map. `highlight` marks the places involved in the current selection
 * (e.g. the replay day); everything else recedes so the eye goes straight to them.
 */
export function MapView({ state, themeKey, mode, highlight, selected, onSelect }: {
  state: State; themeKey: string; mode: MapMode; highlight: Set<string>; selected: string | null; onSelect: (id: string | null) => void;
}) {
  const { t, l, lang } = useI18n();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const lib = useRef<typeof import('maplibre-gl') | null>(null);
  const markers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const visible = useMemo(() => state.locations.filter((x) => (mode === 'local' ? x.scale === 'local' : x.scale === 'country' || x.id === 'irkutsk-city')), [state.locations, mode]);

  useEffect(() => {
    if (!el.current) return;
    let cancelled = false;
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || map.current) return;
      io.disconnect();
      try {
        const [ml, worker] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'), import('maplibre-gl/dist/maplibre-gl.css')]);
        ml.setWorkerUrl(worker.default);
        if (cancelled || !el.current) return;
        lib.current = ml;
        const m = new ml.Map({
          container: el.current, style: styleUrl(), bounds: VIEWS[mode].bounds, fitBoundsOptions: { padding: 40 },
          attributionControl: { compact: true }, cooperativeGestures: matchMedia('(pointer: coarse)').matches, dragRotate: false, pitchWithRotate: false,
        });
        m.touchZoomRotate.disableRotation();
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        m.on('click', () => onSelect(null));
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);
  useEffect(() => { map.current?.setStyle(styleUrl()); }, [themeKey]);

  function addLayers(m: MLMap) {
    if (m.getSource('regions')) return;
    const regionColor: unknown[] = ['match', ['get', 'id']];
    state.regions.forEach((r) => regionColor.push(r.id, cssVar(TIER_VAR[r.tier])));
    regionColor.push('rgba(0,0,0,0)');
    const countryColor: unknown[] = ['match', ['get', 'id']];
    state.countries.forEach((c) => countryColor.push(c.id, cssVar(TIER_VAR[c.tier])));
    countryColor.push('rgba(0,0,0,0)');
    const firstSymbol = m.getStyle().layers?.find((ly) => ly.type === 'symbol')?.id;
    m.addSource('regions', { type: 'geojson', data: `${BASE}geo/russia-regions.json` });
    m.addSource('neighbors', { type: 'geojson', data: `${BASE}geo/neighbors.json` });
    m.addLayer({ id: 'nb-fill', type: 'fill', source: 'neighbors', paint: { 'fill-color': countryColor as never, 'fill-opacity': 0.12 } }, firstSymbol);
    m.addLayer({ id: 'rg-fill', type: 'fill', source: 'regions', paint: { 'fill-color': regionColor as never, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.2, 8, 0.05] } }, firstSymbol);
    m.addLayer({ id: 'rg-line', type: 'line', source: 'regions', paint: { 'line-color': cssVar('--ink-3'), 'line-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.2, 7, 0.45], 'line-width': 0.6 } }, firstSymbol);
    m.addLayer({ id: 'rg-hl', type: 'line', source: 'regions', filter: ['in', ['get', 'id'], ['literal', state.regions.map((r) => r.id)]], paint: { 'line-color': regionColor as never, 'line-width': 1.6 } }, firstSymbol);
    m.addLayer({ id: 'nb-hl', type: 'line', source: 'neighbors', filter: ['in', ['get', 'id'], ['literal', state.countries.map((c) => c.id)]], paint: { 'line-color': countryColor as never, 'line-width': 1.2, 'line-dasharray': [2, 2] } }, firstSymbol);
    const popup = new lib.current!.Popup({ closeButton: false, closeOnClick: false, className: 'tip', offset: 10 });
    m.on('mousemove', 'rg-fill', (e) => {
      const p = e.features?.[0]?.properties as Record<string, string> | undefined;
      if (!p) return;
      popup.setLngLat(e.lngLat).setText(p[lang] || p.en).addTo(m);
    });
    m.on('mouseleave', 'rg-fill', () => popup.remove());
  }

  useEffect(() => {
    const m = map.current;
    const ml = lib.current;
    if (!m || !ml || !ready) return;
    markers.current.forEach((x) => x.remove());
    const anyHl = highlight.size > 0;
    markers.current = visible.map((loc) => {
      const hl = highlight.has(loc.id) || (mode === 'country' && loc.id === 'irkutsk-city' && [...highlight].some((h) => state.locations.find((x) => x.id === h)?.scale === 'local'));
      const node = document.createElement('div');
      node.className = `marker${SQUARE.has(loc.type) ? ' sq' : ''}${hl ? ' hl' : ''}${anyHl && !hl ? ' dim' : ''}${selected === loc.id ? ' sel' : ''}`;
      node.style.setProperty('--c', `var(${TIER_VAR[loc.tier]})`);
      node.innerHTML = '<span class="pulse"></span><span class="core"></span>';
      if (loc.short && (hl || selected === loc.id || !anyHl)) {
        const lab = document.createElement('span');
        lab.className = 'mlabel';
        lab.textContent = l(loc.short);
        node.appendChild(lab);
      }
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');
      node.setAttribute('aria-label', l(loc.name));
      const pick = (ev: Event) => { ev.stopPropagation(); onSelect(loc.id); };
      node.addEventListener('click', pick);
      node.addEventListener('keydown', (ev) => { if ((ev as KeyboardEvent).key === 'Enter') pick(ev); });
      return new ml.Marker({ element: node }).setLngLat([loc.lon, loc.lat]).addTo(m);
    });
  }, [ready, mode, visible, [...highlight].join(), selected, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!map.current || !ready) return;
    map.current.fitBounds(VIEWS[mode].bounds, { padding: 40, maxZoom: VIEWS[mode].maxZoom, duration: 800 });
  }, [mode, ready]);

  const sel: MapLocation | undefined = state.locations.find((x) => x.id === selected);
  return (
    <div className="mapview">
      <div ref={el} className="mapview-canvas" />
      {failed && <div className="map-fallback">{t('mapUnavailable')}</div>}
      {sel && (
        <div className="map-pop" role="dialog" aria-label={l(sel.name)}>
          <button className="close" onClick={() => onSelect(null)} aria-label={t('close')}>×</button>
          <div className="faint small">{t(`loc_${sel.type}`)} · {t(`precision_${sel.precision}`)}</div>
          <h4>{l(sel.name)}</h4>
          {sel.name.ru && <div className="faint small">{sel.name.ru}</div>}
          <p>{l(sel.status)}</p>
        </div>
      )}
    </div>
  );
}

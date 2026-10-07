import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MLMap, Marker, StyleSpecification } from 'maplibre-gl';
import { useI18n } from '../i18n';
import type { MapLocation, State, Tier } from '../types';
import { fmtEventDate } from '../lib/format';
import { Panel, Segmented } from './ui/Misc';
import { TierBadge } from './ui/Badges';
import { Icon } from './ui/Icon';
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

const blankStyle = (): StyleSpecification => ({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': cssVar('--surface-2') } }] });

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
  const [tiers, setTiers] = useState<Set<Tier>>(new Set(['confirmed', 'suspected', 'reported', 'unverified', 'disputed']));
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
    m.addLayer({ id: 'rg-line', type: 'line', source: 'regions', paint: { 'line-color': cssVar('--text-3'), 'line-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.25, 7, 0.5], 'line-width': 0.6 } }, firstSymbol);
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
      node.className = `marker${SQUARE.has(loc.type) ? ' sq' : ''}${epic || loc.type === 'lab' || loc.id === 'shelekhov-hospital' ? ' lg ring' : ''}${!tiers.has(loc.tier) ? ' dim' : ''}${sel === loc.id ? ' sel' : ''}`;
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
  }, [ready, mode, visible.map((v) => v.id).join(), [...tiers].join(), sel, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.fitBounds(VIEWS[mode].bounds, { padding: 40, maxZoom: VIEWS[mode].maxZoom, duration: 900 });
    setSel(null);
  }, [mode, ready]);

  const focus = (loc: MapLocation) => {
    setSel(loc.id);
    if (loc.scale !== mode && !(mode === 'country' && loc.id === 'irkutsk-city')) setMode(loc.scale);
    setTimeout(() => map.current?.easeTo({ center: [loc.lon, loc.lat], zoom: loc.scale === 'local' ? Math.max(map.current.getZoom(), 11) : 4, duration: 700 }), loc.scale !== mode ? 950 : 0);
  };

  const toggleTier = (tier: Tier) => setTiers((s) => { const n = new Set(s); if (n.has(tier)) n.delete(tier); else n.add(tier); return n.size ? n : new Set([tier]); });
  const presentTiers = [...new Set(visible.map((v) => v.tier))];
  const legendTypes = [...new Set(visible.map((v) => v.type))];

  return (
    <Panel
      id="map"
      eyebrow={<><Icon name="map" size={13} />{t('navMap')}</>}
      title={t('mapTitle')}
      bodyClass=""
      tools={
        <>
          <div className="chips scroll">
            {presentTiers.map((tier) => (
              <button key={tier} className="chip" aria-pressed={tiers.has(tier)} onClick={() => toggleTier(tier)}>
                <span className="sw" style={{ background: `var(${TIER_VAR[tier]})`, opacity: tiers.has(tier) ? 1 : 0.3 }} />{t(`tier_${tier}`)}
              </button>
            ))}
          </div>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'local', label: t('mapLocal') }, { value: 'country', label: t('mapCountry') }]} />
        </>
      }
    >
      <div className="mapwrap">
        <div ref={el} style={{ position: 'absolute', inset: 0 }} />
        {(failed || !state) && <div className="map-fallback">{failed ? t('mapUnavailable') : <div className="sk" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />}</div>}
        {ready && (
          <div className="map-overlay map-legend" aria-label={t('mapLegend')}>
            <div className="lt">{t('mapLegend')}</div>
            {legendTypes.map((ty) => (
              <div className="row" key={ty}><span className={`mk${SQUARE.has(ty) ? ' sq' : ''}`} style={{ background: 'var(--text-3)' }} />{t(`loc_${ty}`)}</div>
            ))}
            <div className="row faint" style={{ marginTop: 2 }}>{lang === 'zh' ? '颜色 = 可信度' : 'Colour = credibility tier'}</div>
          </div>
        )}
        {selected && (
          <div className="map-overlay map-card" role="dialog" aria-label={l(selected.name)}>
            <button className="iconbtn close" onClick={() => setSel(null)} aria-label={t('close')}><Icon name="x" size={15} /></button>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingRight: 28 }}>
              <TierBadge tier={selected.tier} small />
              <span className="faint" style={{ fontSize: 11.5 }}>{t(`loc_${selected.type}`)}</span>
            </div>
            <h3>{l(selected.name)}</h3>
            {selected.name.ru && <div className="faint" style={{ fontSize: 12 }}>{selected.name.ru}</div>}
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{l(selected.status)}</p>
            <div className="faint" style={{ fontSize: 11.5, marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="target" size={12} />{t(`precision_${selected.precision}`)}</div>
            {selected.events.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="sec-label" style={{ fontSize: 10.5, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-3)', marginBottom: 4 }}>{t('relatedEvents')}</div>
                {selected.events.map((id) => state?.events.find((e) => e.id === id)).filter(Boolean).map((e) => (
                  <button key={e!.id} className="delta-item" onClick={() => open({ kind: 'event', id: e!.id })}>
                    <TierBadge tier={e!.tier} small noTip />
                    <span style={{ fontSize: 12.5 }}>{l(e!.title)}</span>
                    <span className="when">{fmtEventDate(e!.t, lang, e!.precision)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="maplist">
        {visible.map((loc) => (
          <button key={loc.id} aria-pressed={sel === loc.id} onClick={() => focus(loc)}>
            <span className={`mk${SQUARE.has(loc.type) ? ' sq' : ''}`} style={{ background: `var(${TIER_VAR[loc.tier]})` }} />
            <span className="nm">{l(loc.name)}</span>
            <TierBadge tier={loc.tier} small noTip />
          </button>
        ))}
      </div>
    </Panel>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

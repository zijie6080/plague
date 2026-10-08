import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import type { PharmaPoint, State } from '../types';
import { fmtEventDate, fmtLocal, fmtNum, fmtPct } from '../lib/format';
import { Section, Sk, Tabs } from './ui/Misc';
import { InfoTip, TierBadge } from './ui/Badges';
import { LineChart, type Series } from './ui/Charts';
import { useUI } from './ui-context';

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
const ROLE_ORDER = ['first-line', 'panic', 'control'] as const;
const ROLE_KEY = { 'first-line': 'roleFirstLine', panic: 'rolePanic', control: 'roleControl' } as const;
const last = (s?: PharmaPoint[]) => (s && s.length ? s[s.length - 1] : undefined);

function useNarrow(q = '(max-width: 640px)') {
  const [m, setM] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const mq = matchMedia(q);
    const fn = () => setM(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [q]);
  return m;
}

export function Pharma({ state }: { state: State | null }) {
  const narrow = useNarrow();
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  const [country, setCountry] = useState('ru');
  const [drug, setDrug] = useState('doxycycline');
  const [city, setCity] = useState<string | null>(null);

  if (!state) return <Section id="pharma" title={t('pharmaTitle')} sub={t('pharmaSub')}><Sk h={280} /></Section>;
  const ph = state.pharma;
  const countries = ph.countries?.length ? ph.countries : [];
  const cty = countries.find((c) => c.id === country) || countries[0];
  const cities = ph.cities.filter((c) => !cty || c.country === cty.id);
  const avail = cty?.availMetric || 'inStock';
  const series = (d: string, c: string) => ph.series[`${d}|${c}`] || [];
  const drugs = ph.drugs.filter((d) => cities.some((c) => series(d.id, c.id).length));
  const drugInfo = drugs.find((d) => d.id === drug) || drugs[0];
  const tableCity = city && cities.some((c) => c.id === city) ? city : cities[0]?.id;
  // On phones the table shows one market at a time (switcher above it) instead of scrolling sideways.
  const colCities = narrow ? cities.filter((c) => c.id === tableCity) : cities;
  const latest = drugInfo && tableCity ? ph.latest[`${drugInfo.id}|${tableCity}`] : undefined;
  const maxObs = drugInfo ? Math.max(0, ...cities.map((c) => series(drugInfo.id, c.id).length)) : 0;
  const tFmt = (ms: number) => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'numeric', day: 'numeric', hour: '2-digit', hour12: false }).format(ms);
  const cityLabel = (c: (typeof cities)[number]) => `${l(c.name)}${c.role === 'control' ? ` (${t('roleControl')})` : ''}`;
  const toSeries = (key: keyof PharmaPoint): Series[] => cities.map((c, i) => ({
    id: c.id, label: cityLabel(c), color: SERIES[i % 3], dash: c.role === 'control',
    points: series(drugInfo!.id, c.id).map((p) => ({ t: Date.parse(p.t), v: p[key] as number | null })),
  }));
  const availLabel = avail === 'avail' ? t('pharmacies') : t('inStock');
  const availHelp = avail === 'avail' ? t('pharmaciesHelp') : t('inStockHelp');
  const availCell = (p?: PharmaPoint) => (!p ? '—' : avail === 'avail' ? fmtNum(p.avail, lang) : p.skus ? `${p.inStock}/${p.skus}` : t('outOfStock'));
  const mediaEvents = state.events.filter((e) => e.category === 'pharmacy');

  return (
    <Section
      id="pharma"
      title={t('pharmaTitle')}
      sub={t('pharmaSub')}
      tools={countries.length > 1 && <Tabs label={t('country')} value={cty.id} onChange={(v) => { setCountry(v); setCity(null); }} options={countries.map((c) => ({ value: c.id, label: l(c.name) }))} />}
    >
      {!ph.observations || !cty ? <div className="chart-empty">{t('pharmaNoData')}</div> : (
        <>
          <div className="ph-top">
            <span className="note">{l(cty.sourceName)}. {l(cty.note)}</span>
            {ph.since && <span className="faint small">{t('monitoringSince', { d: fmtLocal(ph.since, lang), n: ph.observations })}</span>}
          </div>

          {narrow && cities.length > 1 && <div style={{ marginBottom: 10 }}><Tabs value={tableCity!} onChange={setCity} options={cities.map((c) => ({ value: c.id, label: l(c.name) }))} /></div>}
          <div className="tablewrap">
            <table className="ph-table">
              <thead>
                <tr>
                  <th>{t('products')}</th>
                  {colCities.map((c) => <th key={c.id} className="n">{cityLabel(c)}</th>)}
                </tr>
                <tr>
                  <th className="faint" style={{ fontWeight: 400, borderBottom: '1px solid var(--rule)' }}>{t('clickRow')}</th>
                  {colCities.map((c) => <th key={c.id} className="n faint" style={{ fontWeight: 400, borderBottom: '1px solid var(--rule)' }}>{t('priceIndex')} · {availLabel}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROLE_ORDER.map((role) => {
                  const rows = drugs.filter((d) => d.role === role);
                  if (!rows.length) return null;
                  return [
                    <tr className="ph-group" key={role}><td colSpan={colCities.length + 1}>{t(ROLE_KEY[role])}</td></tr>,
                    ...rows.map((d) => (
                      <tr key={d.id} aria-selected={drugInfo?.id === d.id} onClick={() => setDrug(d.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setDrug(d.id)}>
                        <td className="drug">{l(d.name)}<small>{d.name.ru}</small></td>
                        {colCities.map((c) => {
                          const p = last(series(d.id, c.id));
                          const chg = p?.index != null ? p.index - 100 : null;
                          return (
                            <td key={c.id} className="n">
                              <span className={chg != null && chg >= 3 ? 'up' : chg != null && chg <= -3 ? 'down' : ''}>{chg != null ? fmtPct(chg) : '—'}</span>
                              <span className="faint" style={{ fontSize: 13, marginLeft: 10 }}>{availCell(p)}</span>
                            </td>
                          );
                        })}
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>

          {drugInfo && (
            <div className="ph-detail">
              <h3>{l(drugInfo.name)} <span className="faint" style={{ fontSize: 15, fontWeight: 400 }}>· {l(cty.name)}</span></h3>
              <div className="legend">
                {cities.map((c, i) => <span key={c.id}><i className={c.role === 'control' ? 'dash' : 'line'} style={{ background: SERIES[i % 3], ['--c' as string]: SERIES[i % 3] }} />{cityLabel(c)}</span>)}
              </div>
              <div className="ph-charts">
                <div>
                  <div className="chart-title">{t('priceIndex')} <InfoTip body={t('priceIndexHelp')} /></div>
                  <div className="chart-sub">100 = {t('vsFirst')}</div>
                  <LineChart series={toSeries('index')} height={200} tFormat={tFmt} yFormat={(v) => fmtNum(v, lang)} refLine={{ v: 100, label: '100' }} ariaLabel={t('priceIndex')} empty={t('pharmaNoData')} />
                </div>
                <div>
                  <div className="chart-title">{availLabel} <InfoTip body={availHelp} /></div>
                  <div className="chart-sub">{l(cty.sourceName)}</div>
                  <LineChart series={toSeries(avail)} height={200} tFormat={tFmt} yFormat={(v) => fmtNum(v, lang)} yMin={0} ariaLabel={availLabel} empty={t('pharmaNoData')} />
                </div>
              </div>
              {maxObs < 4 && <p className="faint small" style={{ marginTop: 10 }}>{t('pharmaEarly')}</p>}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
                <span className="chart-title" style={{ margin: 0 }}>{t('products')}</span>
                {!narrow && cities.length > 1 && <Tabs value={tableCity!} onChange={setCity} options={cities.map((c) => ({ value: c.id, label: l(c.name) }))} />}
                {latest && <a className="link small" href={latest.url} target="_blank" rel="noopener noreferrer">{t('openSource')} ↗</a>}
              </div>
              <div className="tablewrap">
                <table className="offers">
                  <thead><tr><th>{t('products')}</th><th className="n">{t('price')} ({cty.symbol})</th><th className="n hide-sm">{t('vsFirst')}</th><th className="n">{t('availability')}</th></tr></thead>
                  <tbody>
                    {(latest?.offers || []).map((o, i) => (
                      <tr key={i}>
                        <td>{o.name}{o.rx && <span className="faint"> · {t('rx')}</span>}{o.preorder && <span className="faint"> · {t('preorder')}</span>}</td>
                        <td className="n">{o.price != null ? fmtNum(o.price, lang, cty.currency === 'BYN' ? 2 : 0) : '—'}{o.priceMax ? `–${fmtNum(o.priceMax, lang, 2)}` : ''}</td>
                        <td className="n hide-sm" style={{ color: o.firstPrice && o.price && o.price > o.firstPrice ? 'var(--s-alert)' : undefined }}>{o.firstPrice && o.price ? fmtPct((o.price / o.firstPrice - 1) * 100) : '—'}</td>
                        <td className="n">{o.available > 0 ? fmtNum(o.available, lang) : <span style={{ color: 'var(--s-alert)' }}>{t('outOfStock')}</span>}</td>
                      </tr>
                    ))}
                    {!latest?.offers.length && <tr><td colSpan={4} className="faint">{t('outOfStock')}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="ph-foot">
            {country === 'ru' && mediaEvents.map((e) => (
              <button key={e.id} className="link" style={{ textAlign: 'left' }} onClick={() => open({ kind: 'event', id: e.id })}>
                {t('mediaSignals')}: {l(e.title)} ({fmtEventDate(e.t, lang, 'day')}) <TierBadge tier={e.tier} noTip />
              </button>
            ))}
            <span>{t('noSelfMedication')}</span>
            <span>{t('notCovered')}</span>
          </div>
        </>
      )}
    </Section>
  );
}

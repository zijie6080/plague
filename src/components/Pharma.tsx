import { useState } from 'react';
import { useI18n } from '../i18n';
import type { PharmaPoint, State } from '../types';
import { fmtEventDate, fmtLocal, fmtNum, fmtPct } from '../lib/format';
import { Panel, Segmented, Sk } from './ui/Misc';
import { InfoTip, TierBadge } from './ui/Badges';
import { Icon } from './ui/Icon';
import { LineChart, type Series } from './ui/Charts';
import { useUI } from './ui-context';

const CITY_COLOR: Record<string, string> = { irkutsk: 'var(--series-1)', shelekhov: 'var(--series-2)', moscow: 'var(--series-3)' };
const ROLE_ORDER = ['first-line', 'panic', 'control'] as const;
const ROLE_KEY = { 'first-line': 'roleFirstLine', panic: 'rolePanic', control: 'roleControl' } as const;

const last = (s?: PharmaPoint[]) => (s && s.length ? s[s.length - 1] : undefined);

export function Pharma({ state }: { state: State | null }) {
  const { t, l, lang } = useI18n();
  const { open } = useUI();
  const [drug, setDrug] = useState('doxycycline');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [city, setCity] = useState('irkutsk');

  if (!state) {
    return (
      <Panel id="pharma" eyebrow={<><Icon name="pill" size={13} />{t('navPharma')}</>} title={t('pharmaTitle')} sub={t('pharmaSub')}>
        <Sk h={260} />
      </Panel>
    );
  }
  const ph = state.pharma;
  const hasData = ph.observations > 0;
  const series = (d: string, c: string) => ph.series[`${d}|${c}`] || [];
  const tFmt = (ms: number) => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'numeric', day: 'numeric', hour: '2-digit', hour12: false }).format(ms);
  const toSeries = (key: keyof PharmaPoint): Series[] => ph.cities.map((c) => ({
    id: c.id, label: l(c.name), color: CITY_COLOR[c.id], dash: c.role === 'control',
    points: series(drug, c.id).map((p) => ({ t: Date.parse(p.t), v: p[key] as number | null })),
  }));
  const maxObs = Math.max(0, ...ph.cities.map((c) => series(drug, c.id).length));
  const drugInfo = ph.drugs.find((d) => d.id === drug)!;
  const latest = ph.latest[`${drug}|${city}`];
  const mediaEvents = state.events.filter((e) => e.category === 'pharmacy');
  const pharmaSignals = state.anomalies.active.filter((a) => a.subject.drug);

  return (
    <Panel
      id="pharma"
      eyebrow={<><Icon name="pill" size={13} />{t('navPharma')}</>}
      title={t('pharmaTitle')}
      sub={t('pharmaSub')}
      bodyClass=""
      tools={hasData ? <span className="faint" style={{ fontSize: 12 }}>{t('monitoringSince', { d: fmtLocal(ph.since, lang), n: ph.observations })}</span> : undefined}
    >
      {!hasData ? (
        <div className="panel-body"><div className="chart-empty">{t('pharmaNoData')}</div></div>
      ) : (
        <div className="ph-grid">
          <div className="ph-list" role="listbox" aria-label={t('pharmaSummary')}>
            <div className="ph-listhead"><span>{l(ph.cities[0]?.name)}</span><span>{t('priceIndex')} · {t('inStock')}</span></div>
            {ROLE_ORDER.map((role) => (
              <div key={role} style={{ display: 'contents' }}>
                <div className="ph-group">{t(ROLE_KEY[role])}</div>
                {ph.drugs.filter((d) => d.role === role).map((d) => {
                  const p = last(series(d.id, 'irkutsk'));
                  const chg = p?.index != null ? p.index - 100 : null;
                  const flagged = pharmaSignals.some((s) => s.subject.drug === d.id && s.severity !== 'info');
                  return (
                    <button key={d.id} className="ph-drug" role="option" aria-selected={drug === d.id} aria-pressed={drug === d.id} onClick={() => setDrug(d.id)}>
                      <span className="nm">{flagged && <span style={{ color: 'var(--s-watch)' }}>◆ </span>}{l(d.name)}</span>
                      <span className={`chg${chg != null && chg >= 3 ? ' up' : chg != null && chg <= -3 ? ' down' : ''}`}>{chg != null ? fmtPct(chg) : '—'}</span>
                      <span className="role">{d.name.ru}</span>
                      <span className="stock">{p ? (p.skus ? `${p.inStock}/${p.skus}` : t('outOfStock')) : '—'}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="ph-main">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>{l(drugInfo.name)}</h3>
              <span className="tl-cat">{t(ROLE_KEY[drugInfo.role])}</span>
              <div style={{ marginLeft: 'auto' }}>
                <Segmented value={view} onChange={setView} options={[{ value: 'chart', label: <><Icon name="chart" size={13} /> {t('chartView')}</> }, { value: 'table', label: <><Icon name="table" size={13} /> {t('tableView')}</> }]} />
              </div>
            </div>

            <div className="ph-kpis">
              {([['index', 'priceIndex', 'priceIndexHelp'], ['inStock', 'inStock', 'inStockHelp'], ['medianUnit', 'unitPrice', 'unitPriceHelp']] as const).map(([key, label, help]) => (
                <div className="ph-kpi" key={key}>
                  <div className="k">{t(label)}<InfoTip body={t(help)} /></div>
                  <div className="row">
                    {ph.cities.map((c) => {
                      const p = last(series(drug, c.id));
                      const v = p?.[key];
                      return (
                        <span key={c.id} style={{ display: 'inline-flex', flexDirection: 'column' }}>
                          <span className="city"><span style={{ width: 8, height: 2, background: CITY_COLOR[c.id], display: 'inline-block', borderRadius: 2 }} />{l(c.name).replace(/（.*）|\s*\(.*\)/, '')}</span>
                          <span className="v">{v == null ? '—' : key === 'inStock' ? `${v}/${p!.skus}` : key === 'medianUnit' ? `₽${fmtNum(v as number, lang, 1)}` : fmtNum(v as number, lang, 1)}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {view === 'chart' ? (
              <>
                <div className="legend">
                  {ph.cities.map((c) => <span className="li" key={c.id} style={{ color: CITY_COLOR[c.id] }}><span className={`ln${c.role === 'control' ? ' dash' : ''}`} style={{ background: CITY_COLOR[c.id] }} /><span style={{ color: 'var(--text-2)' }}>{l(c.name)}</span></span>)}
                </div>
                <div className="ph-charts">
                  <div>
                    <div className="chart-title">{t('priceIndex')}<InfoTip body={t('priceIndexHelp')} /></div>
                    <LineChart series={toSeries('index')} height={210} tFormat={tFmt} yFormat={(v) => fmtNum(v, lang)} refLine={{ v: 100, label: '100' }} ariaLabel={t('priceIndex')} empty={t('pharmaNoData')} />
                  </div>
                  <div>
                    <div className="chart-title">{t('inStock')}<InfoTip body={t('inStockHelp')} /></div>
                    <LineChart series={toSeries('inStock')} height={210} tFormat={tFmt} yFormat={(v) => fmtNum(v, lang)} yMin={0} ariaLabel={t('inStock')} empty={t('pharmaNoData')} />
                  </div>
                </div>
                {maxObs < 4 && <div className="ph-note"><Icon name="info" size={14} style={{ flex: 'none', marginTop: 1 }} />{t('pharmaEarly')}</div>}
              </>
            ) : (
              <>
                <Segmented value={city} onChange={setCity} options={ph.cities.map((c) => ({ value: c.id, label: l(c.name) }))} />
                <div className="tablewrap">
                  <table className="offers">
                    <thead>
                      <tr><th>{t('products')}</th><th className="n">{t('price')}</th><th className="n hide-sm">{t('vsFirst')}</th><th className="n">{t('availability')}</th></tr>
                    </thead>
                    <tbody>
                      {(latest?.offers || []).map((o, i) => (
                        <tr key={i}>
                          <td>{o.name}{o.rx && <span className="tl-cat" style={{ marginLeft: 6 }}>{t('rx')}</span>}{o.preorder && <span className="tl-cat" style={{ marginLeft: 6 }}>{t('preorder')}</span>}</td>
                          <td className="n">{o.price != null ? `₽${fmtNum(o.price, lang)}` : '—'}</td>
                          <td className="n hide-sm" style={{ color: o.firstPrice && o.price && o.price > o.firstPrice ? 'var(--s-alert)' : undefined }}>{o.firstPrice && o.price ? fmtPct((o.price / o.firstPrice - 1) * 100) : '—'}</td>
                          <td className="n">{o.available > 0 ? o.available : <span style={{ color: 'var(--s-alert)' }}>{t('outOfStock')}</span>}</td>
                        </tr>
                      ))}
                      {!latest?.offers.length && <tr><td colSpan={4} className="faint">{t('outOfStock')}</td></tr>}
                    </tbody>
                  </table>
                </div>
                {latest && <a className="btn-link" style={{ marginTop: 10 }} href={latest.url} target="_blank" rel="noopener noreferrer">{t('openSource')}<Icon name="arrowUpRight" size={12} /></a>}
              </>
            )}

            {mediaEvents.length > 0 && (
              <div className="ph-media">
                <div className="chart-title" style={{ margin: 0 }}>{t('mediaSignals')}</div>
                {mediaEvents.map((e) => (
                  <button key={e.id} className="delta-item" onClick={() => open({ kind: 'event', id: e.id })}>
                    <TierBadge tier={e.tier} small noTip />
                    <span>{l(e.title)}</span>
                    <span className="when">{fmtEventDate(e.t, lang, e.precision)}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="ph-note"><Icon name="heart" size={14} style={{ flex: 'none', marginTop: 1, color: 'var(--t-confirmed)' }} />{t('noSelfMedication')}</div>
          </div>
        </div>
      )}
    </Panel>
  );
}

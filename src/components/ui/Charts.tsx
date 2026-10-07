import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || mag * 10;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export interface Series { id: string; label: string; color: string; dash?: boolean; points: { t: number; v: number | null }[] }

/**
 * Multi-series time chart with crosshair tooltip. One y-axis only. Gaps (null)
 * break the line; isolated points render as dots so a single observation is visible.
 */
export function LineChart({ series, height = 200, yFormat = (v) => String(v), tFormat, refLine, empty, yMin, ariaLabel }: {
  series: Series[]; height?: number; yFormat?: (v: number) => string; tFormat: (t: number) => string; refLine?: { v: number; label: string }; empty?: ReactNode; yMin?: number; ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 38, r: 10, t: 10, b: 22 };
  const all = series.flatMap((s) => s.points.filter((p) => p.v != null)) as { t: number; v: number }[];
  const times = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p.t)))].sort((a, b) => a - b), [series]);

  if (!all.length) return <div className="chart-empty" style={{ height }}>{empty}</div>;

  const tMin = Math.min(...all.map((p) => p.t));
  const tMax = Math.max(...all.map((p) => p.t));
  let vMin = Math.min(...all.map((p) => p.v), refLine?.v ?? Infinity, yMin ?? Infinity);
  let vMax = Math.max(...all.map((p) => p.v), refLine?.v ?? -Infinity);
  if (vMax - vMin < 1e-9) { vMin -= Math.max(1, Math.abs(vMin) * 0.05); vMax += Math.max(1, Math.abs(vMax) * 0.05); }
  const ticks = niceTicks(vMin, vMax, 4);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const iw = Math.max(10, width - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const x = (t: number) => pad.l + (tMax === tMin ? iw / 2 : ((t - tMin) / (tMax - tMin)) * iw);
  const y = (v: number) => pad.t + ih - ((v - y0) / (y1 - y0)) * ih;

  const paths = series.map((s) => {
    let d = '';
    let pen = false;
    const dots: { t: number; v: number }[] = [];
    s.points.forEach((p, i) => {
      if (p.v == null) { pen = false; return; }
      const prev = s.points[i - 1];
      const next = s.points[i + 1];
      if ((!prev || prev.v == null) && (!next || next.v == null)) dots.push(p as { t: number; v: number });
      d += `${pen ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`;
      pen = true;
    });
    return { s, d, dots };
  });

  const xTicks = width > 0 ? (() => {
    const n = Math.max(2, Math.min(6, Math.floor(iw / 90)));
    if (tMax === tMin) return [tMin];
    return Array.from({ length: n }, (_, i) => tMin + ((tMax - tMin) * i) / (n - 1));
  })() : [];

  const onMove = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const px = clientX - rect.left;
    let best = 0, bd = Infinity;
    times.forEach((t, i) => { const d = Math.abs(x(t) - px); if (d < bd) { bd = d; best = i; } });
    setHover(best);
  };

  const ht = hover != null ? times[hover] : null;
  return (
    <div className="chart" ref={ref} style={{ height }} role="img" aria-label={ariaLabel}
      onMouseMove={(e) => onMove(e.clientX)} onMouseLeave={() => setHover(null)}
      onTouchStart={(e) => onMove(e.touches[0].clientX)} onTouchMove={(e) => onMove(e.touches[0].clientX)} onTouchEnd={() => setTimeout(() => setHover(null), 1600)}>
      {width > 0 && (
        <svg width={width} height={height}>
          <g className="grid">{ticks.map((v) => <line key={v} x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} />)}</g>
          <g className="axis">
            {ticks.map((v) => <text key={v} x={pad.l - 6} y={y(v) + 3.5} textAnchor="end">{yFormat(v)}</text>)}
            {xTicks.map((t, i) => <text key={i} x={x(t)} y={height - 5} textAnchor={i === 0 && xTicks.length > 1 ? 'start' : i === xTicks.length - 1 && xTicks.length > 1 ? 'end' : 'middle'}>{tFormat(t)}</text>)}
          </g>
          {refLine && refLine.v >= y0 && refLine.v <= y1 && (
            <g>
              <line x1={pad.l} x2={width - pad.r} y1={y(refLine.v)} y2={y(refLine.v)} stroke="var(--text-3)" strokeDasharray="3 3" strokeWidth={1} />
              <text x={width - pad.r} y={y(refLine.v) - 4} textAnchor="end" fontSize="10" fill="var(--text-3)" fontFamily="var(--mono)">{refLine.label}</text>
            </g>
          )}
          {paths.map(({ s, d, dots }) => (
            <g key={s.id}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dash ? '5 4' : undefined} />
              {dots.map((p) => <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />)}
            </g>
          ))}
          {ht != null && (
            <g>
              <line className="xhair" x1={x(ht)} x2={x(ht)} y1={pad.t} y2={pad.t + ih} />
              {series.map((s) => {
                const p = s.points.find((q) => q.t === ht);
                return p?.v != null ? <circle key={s.id} cx={x(ht)} cy={y(p.v)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} /> : null;
              })}
            </g>
          )}
        </svg>
      )}
      {ht != null && (
        <div className="ctip" style={{ left: Math.min(Math.max(x(ht), 90), width - 90), top: pad.t + 8 }}>
          <div className="tt">{tFormat(ht)}</div>
          {series.map((s) => {
            const p = s.points.find((q) => q.t === ht);
            return (
              <div className="tr" key={s.id}>
                <span className="l"><span className="sw" style={{ background: s.color }} />{s.label}</span>
                <span className="v">{p?.v != null ? yFormat(p.v) : '—'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, width = 64, height = 22, color = 'var(--text-3)' }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * (width - 4) + 2).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`);
  const last = pts[pts.length - 1].split(',');
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.2} fill={color} />
    </svg>
  );
}

/** Stacked hourly bars with a per-bar tooltip. */
export function StackedBars({ data, keys, height = 72, tFormat, ariaLabel }: {
  data: { t: string; [k: string]: number | string }[]; keys: { key: string; label: string; color: string }[]; height?: number; tFormat: (t: number) => string; ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((d) => keys.reduce((s, k) => s + (Number(d[k.key]) || 0), 0));
  const max = Math.max(1, ...totals);
  const pad = { t: 4, b: 16 };
  const ih = height - pad.t - pad.b;
  const bw = width / Math.max(1, data.length);
  const gap = bw > 4 ? 1 : 0;
  const onMove = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    setHover(Math.max(0, Math.min(data.length - 1, Math.floor((clientX - rect.left) / bw))));
  };
  const days = data.map((d, i) => ({ i, t: Date.parse(d.t) })).filter((d) => new Date(d.t).getHours() === 0);
  return (
    <div className="chart" ref={ref} style={{ height }} role="img" aria-label={ariaLabel}
      onMouseMove={(e) => onMove(e.clientX)} onMouseLeave={() => setHover(null)}
      onTouchStart={(e) => onMove(e.touches[0].clientX)} onTouchMove={(e) => onMove(e.touches[0].clientX)} onTouchEnd={() => setTimeout(() => setHover(null), 1600)}>
      {width > 0 && (
        <svg width={width} height={height}>
          <line className="base" x1={0} x2={width} y1={pad.t + ih + 0.5} y2={pad.t + ih + 0.5} />
          {data.map((d, i) => {
            let acc = 0;
            return (
              <g key={d.t} opacity={hover == null || hover === i ? 1 : 0.45}>
                {keys.map((k) => {
                  const v = Number(d[k.key]) || 0;
                  if (!v) return null;
                  const h = (v / max) * ih;
                  const yy = pad.t + ih - acc - h;
                  acc += h;
                  return <rect key={k.key} x={i * bw + gap / 2} y={yy + (acc > h ? 0.5 : 0)} width={Math.max(1, bw - gap)} height={Math.max(1, h - (acc > h ? 1 : 0))} rx={bw > 5 ? 1.5 : 0} fill={k.color} />;
                })}
              </g>
            );
          })}
          <g className="axis">
            {days.map((d) => <text key={d.i} x={d.i * bw} y={height - 3}>{tFormat(d.t)}</text>)}
          </g>
        </svg>
      )}
      {hover != null && (
        <div className="ctip" style={{ left: Math.min(Math.max(hover * bw, 80), width - 80), top: 0 }}>
          <div className="tt">{tFormat(Date.parse(data[hover].t))} · {new Date(data[hover].t).getHours().toString().padStart(2, '0')}:00</div>
          {keys.map((k) => (
            <div className="tr" key={k.key}><span className="l"><span className="sw" style={{ background: k.color }} />{k.label}</span><span className="v">{Number(data[hover][k.key]) || 0}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

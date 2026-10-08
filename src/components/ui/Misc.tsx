import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Sk({ w = '100%', h = 12, style }: { w?: number | string; h?: number; style?: React.CSSProperties }) {
  return <div className="sk" style={{ width: w, height: h, ...style }} />;
}

/** Counts from the previous value to the new one when data changes. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); from.current = value; return; }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 800);
      setShown(start + (value - start) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step); else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(Math.round(shown))}</>;
}

export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="tabs" role="group" aria-label={label}>
      {options.map((o) => <button key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}
/** @deprecated alias kept for older call sites */
export const Segmented = Tabs;

export function Section({ id, title, sub, tools, children }: { id?: string; title: ReactNode; sub?: ReactNode; tools?: ReactNode; children: ReactNode }) {
  return (
    <section className="section" id={id} aria-labelledby={id ? `${id}-h` : undefined}>
      <header className="sec-head">
        <div>
          <h2 id={id ? `${id}-h` : undefined}>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {tools && <div className="tools">{tools}</div>}
      </header>
      {children}
    </section>
  );
}

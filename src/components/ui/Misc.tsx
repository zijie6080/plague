import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Sk({ w = '100%', h = 12, r, style }: { w?: number | string; h?: number; r?: number; style?: React.CSSProperties }) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** Counts from the previous value to the new one when data changes. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(value); from.current = value; return; }
    const t0 = performance.now();
    const dur = 900;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(start + (value - start) * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(Math.round(shown))}</>;
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Panel({ id, eyebrow, title, sub, tools, children, className = '', bodyClass = 'panel-body' }: { id?: string; eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; tools?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={`panel ${className}`} id={id} aria-labelledby={id ? `${id}-h` : undefined}>
      <div className="panel-head">
        <div className="panel-title">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2 id={id ? `${id}-h` : undefined}>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {tools && <div className="panel-tools">{tools}</div>}
      </div>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

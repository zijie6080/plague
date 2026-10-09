import { useCallback, useEffect, useRef, useState } from 'react';
import type { State } from '../types';

// VITE_STATE_URL lets a static host (Vercel) read live data proxied from the
// collector's host; the bundled snapshot is the fallback if that is unreachable.
const FALLBACK_URL = `${import.meta.env.BASE_URL}data/state.json`;
const STATE_URL = import.meta.env.VITE_STATE_URL || FALLBACK_URL;
const STREAM_URL = `${import.meta.env.BASE_URL}api/stream`;
const POLL_MS = 60_000;

export type Conn = 'connecting' | 'live' | 'polling' | 'offline';

/**
 * Loads state.json, then keeps it fresh: Server-Sent Events when the Node server
 * is running (push within seconds), falling back to ETag polling on static hosting.
 * `onChange(prev, next)` lets the UI announce what changed.
 */
export function useData(onChange?: (prev: State, next: State) => void) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conn, setConn] = useState<Conn>('connecting');
  const etag = useRef<string | null>(null);
  const prev = useRef<State | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  const load = useCallback(async () => {
    try {
      let res = await fetch(STATE_URL, { headers: etag.current ? { 'if-none-match': etag.current } : {}, cache: 'no-cache' }).catch(() => null);
      if (res?.status === 304) return;
      let next: State | null = null;
      if (res?.ok) next = (await res.json().catch(() => null)) as State | null;
      if (!next && STATE_URL !== FALLBACK_URL) {
        res = await fetch(FALLBACK_URL, { cache: 'no-cache' });
        if (res.ok) next = (await res.json()) as State;
        // Never replace newer data with an older bundled snapshot.
        if (next && prev.current && Date.parse(next.generatedAt) <= Date.parse(prev.current.generatedAt)) return;
      }
      if (!res || !next) throw new Error(`HTTP ${res?.status ?? 0}`);
      etag.current = res.headers.get('etag');
      if (prev.current && prev.current.generatedAt === next.generatedAt) return;
      if (prev.current) cb.current?.(prev.current, next);
      prev.current = next;
      setState(next);
      setError(null);
    } catch (err) {
      setError(String(err));
      throw err;
    }
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    let gotHello = false;
    load().catch(() => setConn('offline'));
    // Polling always runs (cheap 304s); SSE, when available, just makes updates instant.
    const poll = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      load().then(() => setConn((c) => (c === 'live' ? c : 'polling'))).catch(() => setConn('offline'));
    }, POLL_MS);
    // Static hosting (Vercel) has no stream endpoint; polling alone keeps it fresh.
    if ('EventSource' in window && !import.meta.env.VITE_STATE_URL) {
      es = new EventSource(STREAM_URL);
      es.addEventListener('hello', () => { gotHello = true; setConn('live'); });
      es.addEventListener('state', () => load().catch(() => {}));
      es.onerror = () => {
        if (!gotHello) { es?.close(); es = null; } // static hosting: no stream endpoint
        setConn((c) => (c === 'offline' ? c : 'polling'));
      };
    }
    setTimeout(() => setConn((c) => (c === 'connecting' ? 'polling' : c)), 4000);
    const onVis = () => document.visibilityState === 'visible' && load().catch(() => {});
    const onOnline = () => load().then(() => setConn(es?.readyState === 1 ? 'live' : 'polling')).catch(() => {});
    const onOffline = () => setConn('offline');
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      es?.close();
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [load]);

  return { state, error, conn, reload: load };
}

/** Re-render on an interval so relative times ("3 min ago") stay current. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

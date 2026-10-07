import { useSyncExternalStore } from 'react';

export type Toast = { id: number; title: string; body?: string; tone?: 'info' | 'watch' | 'alert' | 'ok'; action?: { label: string; onClick: () => void } };

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(t: Omit<Toast, 'id'>, ttl = 5200) {
  const id = ++seq;
  toasts = [...toasts.slice(-3), { ...t, id }];
  emit();
  if (ttl > 0) setTimeout(() => dismiss(id), ttl);
  return id;
}

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => toasts,
  );
}

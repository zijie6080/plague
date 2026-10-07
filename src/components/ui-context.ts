import { createContext, useContext } from 'react';

export type Focus = { kind: 'event' | 'metric' | 'location' | 'signal'; id: string } | null;
export const UIContext = createContext<{ open: (f: Focus) => void; seen: Set<string> }>({ open: () => {}, seen: new Set() });
export const useUI = () => useContext(UIContext);

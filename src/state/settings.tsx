import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';

import type { CompareId } from '@/data/mark';
import { usePersistedState } from '@/state/persisted';

export type GlossLanguage = 'de' | 'en' | 'es';

export type Settings = {
  /** Vergleichsübersetzung unter jedem Vers, oder keine */
  compare: CompareId | null;
  /** Sprache der Wortbedeutungen in der Interlinear-Zeile; ohne deutsche KI-Glossen gilt Englisch */
  glossLanguage: GlossLanguage;
  /** Interlinear beim Öffnen eines Kapitels sofort zeigen */
  interlinear: boolean;
  /** Umschrift unter dem griechischen Wort */
  showTranslit: boolean;
  /** Grammatik-Kurzform unter jedem Wort */
  showGrammar: boolean;
  /** Zuletzt gelesenes Kapitel */
  lastChapter: number;
  /** Nur im Testlauf: Abo simulieren, solange RevenueCat noch nicht eingebunden ist */
  simulateSubscription: boolean;
};

const DEFAULTS: Settings = {
  compare: null,
  glossLanguage: 'de',
  interlinear: false,
  showTranslit: true,
  showGrammar: true,
  lastChapter: 1,
  simulateSubscription: true,
};

type SettingsContextValue = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [stored, setStored] = usePersistedState<Settings>('settings.v1', DEFAULTS);
  const value = useMemo<SettingsContextValue>(
    () => ({
      settings: { ...DEFAULTS, ...stored },
      update: (patch) => setStored((prev) => ({ ...DEFAULTS, ...prev, ...patch })),
    }),
    [stored, setStored],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings braucht einen SettingsProvider');
  return ctx;
}

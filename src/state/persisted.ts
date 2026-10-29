import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useState, das seinen Wert lokal auf dem Gerät speichert.
 * Später übernimmt für Notizen die Synchronisation mit dem Konto (Supabase).
 */
export function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(value);
  const touched = useRef(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!alive || raw == null || touched.current) return;
        try {
          const parsed = JSON.parse(raw) as T;
          latest.current = parsed;
          setValue(parsed);
        } catch {
          // Beschädigter Eintrag: mit dem Startwert weitermachen.
        }
      })
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(latest.current) : next;
      touched.current = true;
      latest.current = resolved;
      setValue(resolved);
      AsyncStorage.setItem(key, JSON.stringify(resolved)).catch(() => {});
    },
    [key],
  );

  return [value, update, loaded] as const;
}

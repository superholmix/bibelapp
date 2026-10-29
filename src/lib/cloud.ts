import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Verbindung zum Backend (Supabase, EU). Die Werte kommen aus .env (siehe .env.example) und sind
 * öffentlich: Der anon-Schlüssel darf in der App stehen, die Zugriffsregeln liegen in der Datenbank.
 * Fehlen sie, läuft die App ohne Konto weiter, alles bleibt auf dem Gerät.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const cloud: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

if (cloud && Platform.OS !== 'web') {
  // Sitzung nur im Vordergrund erneuern, wie von Supabase für React Native empfohlen
  AppState.addEventListener('change', (state) => {
    if (state === 'active') cloud.auth.startAutoRefresh();
    else cloud.auth.stopAutoRefresh();
  });
}

/** Fehler einer Backend-Funktion mit festem Code (siehe supabase/functions/_shared/http.ts). */
export class CloudError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Ruft eine Backend-Funktion auf und wirft CloudError mit verständlicher Meldung. */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!cloud) throw new CloudError('offline', 'Für diese Funktion ist noch kein Backend eingerichtet.');
  const { data, error } = await cloud.functions.invoke<T>(name, { body });
  if (!error) return data as T;
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = (await error.context.json()) as { error?: string; message?: string };
      throw new CloudError(payload.error ?? 'server', payload.message ?? 'Unbekannter Fehler im Backend.');
    } catch (err) {
      if (err instanceof CloudError) throw err;
    }
  }
  throw new CloudError('network', 'Keine Verbindung zum Backend. Bist du online?');
}

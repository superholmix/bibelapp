import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { cloud } from '@/lib/cloud';
import { useAuth } from '@/state/auth';
import { usePersistedState } from '@/state/persisted';

export type Note = {
  /** Versschlüssel, z. B. "Mrk.1.1" */
  key: string;
  chapter: number;
  verse: number;
  text: string;
  updatedAt: string;
  /** Gelöscht, aber das Löschen muss noch ans Konto gehen */
  deleted?: boolean;
  /** Seit der letzten Synchronisation geändert. Fehlt bei alten Notizen: dann gilt sie als geändert. */
  dirty?: boolean;
};

export type SyncState = 'off' | 'idle' | 'syncing' | 'error';

type NotesContextValue = {
  notes: Record<string, Note>;
  getNote: (key: string) => Note | undefined;
  saveNote: (chapter: number, verse: number, key: string, text: string) => void;
  deleteNote: (key: string) => void;
  /** Alle Notizen in Bibelreihenfolge */
  sorted: Note[];
  sync: { state: SyncState; lastSyncedAt: string | null; run: () => Promise<void> };
  /** Beim Abmelden: Notizen von diesem Gerät entfernen (sie bleiben im Konto) */
  clearLocal: () => void;
};

type ServerNote = { verse_key: string; text: string; updated_at: string; deleted: boolean; synced_at: string };
type Cursor = { userId: string; syncedAt: string };

const CURSOR_KEY = 'notes.cursor.v1';
const PAGE = 500;
// Zeilen, die kurz vor dem letzten Stand geschrieben wurden, noch einmal holen (gleichzeitige Schreibvorgänge)
const OVERLAP_MS = 60_000;

const NotesContext = createContext<NotesContextValue | null>(null);

const needsPush = (n: Note) => n.dirty !== false;

function parseKey(key: string) {
  const [, c, v] = key.split('.');
  return { chapter: Number(c), verse: Number(v) };
}

export function NotesProvider({ children }: PropsWithChildren) {
  const [notes, setNotes, loaded] = usePersistedState<Record<string, Note>>('notes.v1', {});
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>('off');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const running = useRef<Promise<void> | null>(null);

  const runSync = useCallback(async () => {
    if (!cloud || !user || !loaded) return;
    if (running.current) return running.current;
    const job = (async () => {
      setSyncState('syncing');
      try {
        // 1. Eigene Änderungen hochladen. Ältere Stände überschreiben neuere auf dem Server nicht.
        const pending = Object.values(notesRef.current).filter(needsPush);
        for (let i = 0; i < pending.length; i += PAGE) {
          const batch = pending.slice(i, i + PAGE);
          const { error } = await cloud!.rpc('push_notes', {
            changes: batch.map((n) => ({ verse_key: n.key, text: n.deleted ? '' : n.text, updated_at: n.updatedAt, deleted: !!n.deleted })),
          });
          if (error) throw error;
          setNotes((prev) => {
            const next = { ...prev };
            for (const sent of batch) {
              const now = next[sent.key];
              // Inzwischen erneut geändert: bleibt markiert und geht beim nächsten Mal mit
              if (!now || now.updatedAt !== sent.updatedAt) continue;
              if (now.deleted) delete next[sent.key];
              else next[sent.key] = { ...now, dirty: false };
            }
            return next;
          });
        }

        // 2. Änderungen von anderen Geräten holen
        const raw = await AsyncStorage.getItem(CURSOR_KEY);
        const stored = raw ? (JSON.parse(raw) as Cursor) : null;
        const start = stored?.userId === user.id ? Date.parse(stored.syncedAt) - OVERLAP_MS : 0;
        // Blättern nach (synced_at, verse_key), damit gleich alte Zeilen an Seitengrenzen nicht verloren gehen (pull_notes)
        let after = { syncedAt: new Date(Math.max(0, start)).toISOString(), key: '' };
        let newest = stored?.userId === user.id ? stored.syncedAt : after.syncedAt;
        for (;;) {
          const { data, error } = await cloud!.rpc('pull_notes', { after_synced: after.syncedAt, after_key: after.key, max_rows: PAGE });
          if (error) throw error;
          const rows = (data ?? []) as ServerNote[];
          if (rows.length) {
            setNotes((prev) => {
              const next = { ...prev };
              for (const row of rows) {
                const local = next[row.verse_key];
                // Lokal neuer und noch nicht hochgeladen: lokale Fassung behalten
                if (local && needsPush(local) && Date.parse(local.updatedAt) > Date.parse(row.updated_at)) continue;
                if (row.deleted) delete next[row.verse_key];
                else next[row.verse_key] = { key: row.verse_key, ...parseKey(row.verse_key), text: row.text, updatedAt: row.updated_at, dirty: false };
              }
              return next;
            });
            const last = rows[rows.length - 1];
            after = { syncedAt: last.synced_at, key: last.verse_key };
            if (Date.parse(last.synced_at) > Date.parse(newest)) newest = last.synced_at;
          }
          if (rows.length < PAGE) break;
        }
        await AsyncStorage.setItem(CURSOR_KEY, JSON.stringify({ userId: user.id, syncedAt: newest } satisfies Cursor));
        setLastSyncedAt(new Date().toISOString());
        setSyncState('idle');
      } catch (err) {
        console.warn('Notizen-Sync fehlgeschlagen', err);
        setSyncState('error');
      }
    })();
    running.current = job;
    try {
      await job;
    } finally {
      running.current = null;
    }
  }, [user, loaded, setNotes]);

  // Nach dem Anmelden, beim Zurückkehren in die App und kurz nach jeder Änderung synchronisieren
  useEffect(() => {
    if (!user) {
      setSyncState('off');
      return;
    }
    runSync();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && runSync());
    return () => sub.remove();
  }, [user, runSync]);

  const pendingCount = useMemo(() => Object.values(notes).filter(needsPush).length, [notes]);
  useEffect(() => {
    if (!user || !pendingCount) return;
    const t = setTimeout(runSync, 2000);
    return () => clearTimeout(t);
  }, [user, pendingCount, notes, runSync]);

  const value = useMemo<NotesContextValue>(() => {
    const visible = Object.values(notes).filter((n) => !n.deleted);
    const sorted = visible.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
    const remove = (key: string) =>
      setNotes((prev) => {
        const existing = prev[key];
        if (!existing) return prev;
        const next = { ...prev };
        // Nie synchronisiert: einfach weg. Sonst als gelöscht markieren, damit das Konto es erfährt.
        if (existing.dirty !== false && !user) delete next[key];
        else next[key] = { ...existing, text: '', deleted: true, dirty: true, updatedAt: new Date().toISOString() };
        return next;
      });
    return {
      notes,
      sorted,
      getNote: (key) => (notes[key]?.deleted ? undefined : notes[key]),
      saveNote: (chapter, verse, key, text) => {
        const trimmed = text.trim();
        if (!trimmed) return remove(key);
        setNotes((prev) => {
          if (prev[key] && !prev[key].deleted && prev[key].text === trimmed) return prev;
          return { ...prev, [key]: { key, chapter, verse, text: trimmed, updatedAt: new Date().toISOString(), dirty: true } };
        });
      },
      deleteNote: remove,
      sync: { state: syncState, lastSyncedAt, run: runSync },
      clearLocal: () => {
        setNotes({});
        AsyncStorage.removeItem(CURSOR_KEY).catch(() => {});
      },
    };
  }, [notes, setNotes, syncState, lastSyncedAt, runSync, user]);

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes braucht einen NotesProvider');
  return ctx;
}

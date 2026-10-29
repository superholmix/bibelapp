import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';

import { usePersistedState } from '@/state/persisted';

export type Note = {
  /** Versschlüssel, z. B. "Mrk.1.1" */
  key: string;
  chapter: number;
  verse: number;
  text: string;
  updatedAt: string;
};

type NotesContextValue = {
  notes: Record<string, Note>;
  getNote: (key: string) => Note | undefined;
  saveNote: (chapter: number, verse: number, key: string, text: string) => void;
  deleteNote: (key: string) => void;
  /** Alle Notizen in Bibelreihenfolge */
  sorted: Note[];
};

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: PropsWithChildren) {
  const [notes, setNotes] = usePersistedState<Record<string, Note>>('notes.v1', {});

  const value = useMemo<NotesContextValue>(() => {
    const sorted = Object.values(notes).sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
    return {
      notes,
      sorted,
      getNote: (key) => notes[key],
      saveNote: (chapter, verse, key, text) =>
        setNotes((prev) => {
          const trimmed = text.trim();
          const next = { ...prev };
          if (!trimmed) delete next[key];
          else next[key] = { key, chapter, verse, text: trimmed, updatedAt: new Date().toISOString() };
          return next;
        }),
      deleteNote: (key) =>
        setNotes((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        }),
    };
  }, [notes, setNotes]);

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes braucht einen NotesProvider');
  return ctx;
}

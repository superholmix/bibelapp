import { getStudyVerse, type Word } from '@/data/mark';
import type { GlossLanguage } from '@/state/settings';

export type Gloss = {
  text: string;
  /** Wort, das im Original steht, aber üblicherweise nicht übersetzt wird (in <…> gesetzt) */
  silent: boolean;
  /** Tatsächlich gezeigte Sprache; ohne deutsche KI-Glossen fällt Deutsch auf Englisch zurück */
  language: GlossLanguage;
};

export function glossFor(word: Word, index: number, chapter: number, verse: number, language: GlossLanguage): Gloss {
  let raw = '';
  let shown: GlossLanguage = language;
  if (language === 'de') raw = getStudyVerse(chapter, verse)?.glosses?.[index] ?? '';
  if (!raw) {
    shown = language === 'es' ? 'es' : 'en';
    raw = shown === 'es' ? word.es : word.en;
  }
  const silent = /^<.*>$/.test(raw.trim());
  return { text: raw.replace(/[<>]/g, ''), silent, language: shown };
}

export const LANGUAGE_LABEL: Record<GlossLanguage, string> = { de: 'Deutsch', en: 'Englisch', es: 'Spanisch' };

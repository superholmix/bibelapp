/**
 * Zugriff auf die Markus-Daten in assets/data/ (erzeugt von pipeline/build-mark.mjs).
 * Metro braucht statische require-Aufrufe, deshalb ist jedes Kapitel einzeln aufgeführt.
 */

import lexiconData from '@/assets/data/lexicon.json';
import morphData from '@/assets/data/morph.json';
import exegesisDe from '@/assets/data/exegesis-de.json';
import studyDe from '@/assets/data/study-de.json';

export type Word = {
  /** Griechische Wortform mit Satzzeichen */
  g: string;
  /** Umschrift */
  tr: string;
  /** Englische Übersetzung im Zusammenhang (STEPBible, nach BSB) */
  en: string;
  /** Spanische Übersetzung im Zusammenhang */
  es: string;
  /** Strong-Nummern (mehrere bei verschmolzenen Wörtern wie κἀκεῖ) */
  s: string[];
  /** Grammatik-Codes, parallel zu s */
  m: string[];
  /** Grundform (Lemma) */
  l: string;
  /** Kurzbedeutung der Grundform */
  gl: string;
  /** Neuer Absatz beginnt nach diesem Wort */
  p?: 1;
};

export type CompareId = 'elb1905' | 'bsb' | 'kjv' | 'rv1909';

export type Verse = {
  v: number;
  words: Word[];
  cmp: Partial<Record<CompareId, string>>;
};

export type Chapter = {
  chapter: number;
  verses: Verse[];
};

export type LexiconEntry = {
  lemma: string;
  tr: string;
  gloss: string;
  def: string;
  /** Häufigkeit im Markusevangelium */
  n?: number;
};

export type StudyVerse = {
  text: string;
  notes?: { anchor: string; text: string }[];
  /** Deutsche Wortbedeutungen, parallel zu Verse.words */
  glosses?: string[];
};

type StudyFile = {
  status: 'pending' | 'draft' | 'reviewed';
  model?: string;
  promptVersion?: string;
  verses: Record<string, StudyVerse>;
  /** Abschnittsüberschriften, Schlüssel ist der erste Vers ("1.1") */
  sections?: Record<string, string>;
};

export type ExegesisPosition = {
  name: string;
  claim: string;
  arguments: string[];
  textBasis: string;
  standing: string;
  proponents: string[];
  literature: { author: string; title: string; year: string; sure: boolean }[];
};

export type ExegesisTopic = {
  id: string;
  chapter: number;
  from: number;
  to: number;
  title: string;
  question: string;
  summary: string;
  hinges: string[];
  positions: ExegesisPosition[];
  reviewed: boolean;
};

type ExegesisFile = {
  status: 'pending' | 'draft' | 'reviewed';
  model?: string;
  topics: Record<string, ExegesisTopic>;
};

const chapters: Record<number, () => Chapter> = {
  1: () => require('@/assets/data/mark/chapter-1.json'),
  2: () => require('@/assets/data/mark/chapter-2.json'),
  3: () => require('@/assets/data/mark/chapter-3.json'),
  4: () => require('@/assets/data/mark/chapter-4.json'),
  5: () => require('@/assets/data/mark/chapter-5.json'),
  6: () => require('@/assets/data/mark/chapter-6.json'),
  7: () => require('@/assets/data/mark/chapter-7.json'),
  8: () => require('@/assets/data/mark/chapter-8.json'),
  9: () => require('@/assets/data/mark/chapter-9.json'),
  10: () => require('@/assets/data/mark/chapter-10.json'),
  11: () => require('@/assets/data/mark/chapter-11.json'),
  12: () => require('@/assets/data/mark/chapter-12.json'),
  13: () => require('@/assets/data/mark/chapter-13.json'),
  14: () => require('@/assets/data/mark/chapter-14.json'),
  15: () => require('@/assets/data/mark/chapter-15.json'),
  16: () => require('@/assets/data/mark/chapter-16.json'),
};

export const BOOK = { id: 'Mrk', name: 'Markus', chapterCount: 16 } as const;

export const COMPARE_TRANSLATIONS: Record<CompareId, { label: string; short: string; language: string }> = {
  elb1905: { label: 'Elberfelder 1905', short: 'ELB', language: 'Deutsch' },
  bsb: { label: 'Berean Standard Bible', short: 'BSB', language: 'Englisch' },
  kjv: { label: 'King James Version', short: 'KJV', language: 'Englisch' },
  rv1909: { label: 'Reina-Valera 1909', short: 'RV', language: 'Spanisch' },
};

const cache = new Map<number, Chapter>();

export function getChapter(n: number): Chapter {
  const hit = cache.get(n);
  if (hit) return hit;
  const load = chapters[n];
  if (!load) throw new Error(`Markus ${n} gibt es nicht`);
  const chapter = load();
  cache.set(n, chapter);
  return chapter;
}

const lexicon = lexiconData as Record<string, LexiconEntry>;
export function getLexiconEntry(strong: string): LexiconEntry | undefined {
  return lexicon[strong];
}

const morph = morphData as Record<string, Record<string, string>>;
export function getMorphParts(code: string): Record<string, string> | undefined {
  return morph[code];
}

const study = studyDe as StudyFile;
export const studyStatus = study.status;
export function getStudyVerse(chapter: number, verse: number): StudyVerse | undefined {
  return study.verses[`${chapter}.${verse}`];
}

export function getSectionHeading(chapter: number, verse: number): string | undefined {
  return study.sections?.[`${chapter}.${verse}`];
}

const exegesis = exegesisDe as ExegesisFile;
export const exegesisStatus = exegesis.status;
const topics = Object.values(exegesis.topics).sort((a, b) => a.chapter - b.chapter || a.from - b.from);

export function getTopicsForChapter(chapter: number): ExegesisTopic[] {
  return topics.filter((t) => t.chapter === chapter);
}

export function getTopicsForVerse(chapter: number, verse: number): ExegesisTopic[] {
  return topics.filter((t) => t.chapter === chapter && verse >= t.from && verse <= t.to);
}

export function verseKey(chapter: number, verse: number) {
  return `${BOOK.id}.${chapter}.${verse}`;
}

export function formatRef(chapter: number, verse?: number) {
  return verse ? `${BOOK.name} ${chapter},${verse}` : `${BOOK.name} ${chapter}`;
}

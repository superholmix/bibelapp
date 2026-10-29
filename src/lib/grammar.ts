/**
 * Übersetzt die Grammatik-Codes (Robinson/Tauber, aufgeschlüsselt durch STEPBible TEGMC)
 * in Alltagssprache. Der Fachbegriff bleibt sichtbar, die Erklärung steht daneben.
 */

import { getMorphParts } from '@/data/mark';

export type WordKind = 'verb' | 'noun' | 'function' | 'other';

export type GrammarRow = {
  label: string;
  value: string;
  explain?: string;
};

export type GrammarInfo = {
  kind: WordKind;
  /** Wortart in Alltagssprache, z. B. "Verb" */
  partOfSpeech: string;
  /** Kurzform für die Interlinear-Zeile, z. B. "Aorist" oder "Genitiv" */
  short: string;
  /** Ganze Bestimmung in einer Zeile */
  summary: string;
  rows: GrammarRow[];
};

type Term = { de: string; explain?: string };

const FUNCTION: Record<string, Term & { kind: WordKind }> = {
  Verb: { de: 'Verb', kind: 'verb', explain: 'Ein Tätigkeits- oder Zustandswort.' },
  Noun: { de: 'Nomen', kind: 'noun', explain: 'Ein Hauptwort: Person, Sache oder Begriff.' },
  'Indeclinable Proper Noun': { de: 'Eigenname', kind: 'noun', explain: 'Ein Name, dessen Form sich nicht verändert.' },
  'Indeclinable Noun of Other type': { de: 'Nomen', kind: 'noun', explain: 'Ein Hauptwort, dessen Form sich nicht verändert.' },
  'Aramaic transliterated word': { de: 'Aramäisches Wort', kind: 'other', explain: 'Ein Wort aus der Muttersprache Jesu, in griechischen Buchstaben wiedergegeben.' },
  Adjective: { de: 'Adjektiv', kind: 'other', explain: 'Ein Eigenschaftswort; es richtet sich in Fall, Zahl und Geschlecht nach seinem Bezugswort.' },
  Adverb: { de: 'Adverb', kind: 'function', explain: 'Ein Umstandswort: wie, wann, wo etwas geschieht.' },
  'Adverb or adverb and particle combined': { de: 'Adverb', kind: 'function', explain: 'Ein Umstandswort: wie, wann, wo etwas geschieht.' },
  Conjunction: { de: 'Bindewort', kind: 'function', explain: 'Verbindet Wörter oder Sätze, z. B. „und“, „aber“, „denn“.' },
  Preposition: { de: 'Präposition', kind: 'function', explain: 'Ein Verhältniswort wie „in“, „aus“, „mit“; es bestimmt den Fall des folgenden Wortes.' },
  'Definite article': { de: 'Artikel', kind: 'function', explain: 'Der griechische Artikel „der, die, das“. Er wird oft anders gebraucht als im Deutschen und manchmal nicht übersetzt.' },
  'Personal pronoun': { de: 'Personalpronomen', kind: 'function', explain: 'Ein Fürwort wie „ich“, „du“, „er“. Steht es betont da, wird die Person hervorgehoben.' },
  'Relative pronoun': { de: 'Relativpronomen', kind: 'function', explain: 'Leitet einen Nebensatz ein: „der“, „welcher“.' },
  'Demonstrative pronoun': { de: 'Hinweisendes Fürwort', kind: 'function', explain: 'Zeigt auf etwas: „dieser“, „jener“.' },
  'Demonstrative pronoun+Conjunction': { de: 'Hinweisendes Fürwort mit Bindewort', kind: 'function' },
  'Interrogative pronoun': { de: 'Fragewort', kind: 'function', explain: 'Fragt nach etwas: „wer?“, „was?“.' },
  'Indefinite pronoun': { de: 'Unbestimmtes Fürwort', kind: 'function', explain: '„jemand“, „etwas“, „ein gewisser“.' },
  'Reflexive pronoun': { de: 'Rückbezügliches Fürwort', kind: 'function', explain: '„sich“, „selbst“: bezieht sich auf das Subjekt zurück.' },
  'Reciprocal pronoun': { de: 'Wechselseitiges Fürwort', kind: 'function', explain: '„einander“.' },
  'Possessive pronoun': { de: 'Besitzanzeigendes Fürwort', kind: 'function', explain: '„mein“, „dein“, „unser“.' },
  'Correlative pronoun': { de: 'Korrelativpronomen', kind: 'function', explain: '„so beschaffen“, „so groß“.' },
  'Correlative or Interrogative pronoun': { de: 'Frage- oder Korrelativpronomen', kind: 'function', explain: '„wie beschaffen?“, „wie groß?“.' },
  Interjection: { de: 'Ausruf', kind: 'function', explain: 'Ein Ausrufewort wie „siehe!“.' },
  'Negative Particle': { de: 'Verneinung', kind: 'function', explain: '„nicht“, „kein“. Griechisch unterscheidet οὐ (Tatsache) und μή (Wille, Möglichkeit).' },
  'Particle or Disjunctive': { de: 'Partikel', kind: 'function', explain: 'Ein kleines Wort, das Ton oder Verhältnis eines Satzes färbt.' },
  'Interrogative Particle': { de: 'Fragepartikel', kind: 'function', explain: 'Macht aus dem Satz eine Frage.' },
};

const TENSE: Record<string, Term> = {
  Present: { de: 'Präsens', explain: 'Die Handlung wird als laufend, wiederholt oder andauernd gesehen.' },
  Imperfect: { de: 'Imperfekt', explain: 'Eine andauernde oder wiederholte Handlung in der Vergangenheit: „war dabei zu …“, „pflegte zu …“.' },
  Future: { de: 'Futur', explain: 'Etwas, das geschehen wird.' },
  Aorist: { de: 'Aorist', explain: 'Die Handlung wird als Ganzes gesehen, als einzelnes Ereignis, ohne Blick auf ihre Dauer. Im Indikativ meist Vergangenheit.' },
  Perfect: { de: 'Perfekt', explain: 'Eine abgeschlossene Handlung, deren Ergebnis fortbesteht: „es ist geschrieben und steht nun da“.' },
  Pluperfect: { de: 'Plusquamperfekt', explain: 'Ein Zustand in der Vergangenheit, der aus einer noch früheren Handlung folgte.' },
};

const VOICE: Record<string, Term> = {
  Active: { de: 'Aktiv', explain: 'Das Subjekt handelt selbst.' },
  Middle: { de: 'Medium', explain: 'Das Subjekt handelt an sich selbst oder für sich selbst.' },
  Passive: { de: 'Passiv', explain: 'Am Subjekt wird gehandelt. Steht kein Handelnder dabei, ist oft Gott gemeint („passivum divinum“).' },
  'Middle or Passive': { de: 'Medium oder Passiv', explain: 'Die Form kann beides sein; der Zusammenhang entscheidet.' },
  'Middle Deponent': { de: 'Deponens (Medium)', explain: 'Die Form sieht aus wie ein Medium, bedeutet aber einfach aktiv.' },
  'Passive Deponent': { de: 'Deponens (Passiv)', explain: 'Die Form sieht aus wie ein Passiv, bedeutet aber einfach aktiv.' },
  'Middle or Passive Deponent': { de: 'Deponens', explain: 'Die Form ist medial oder passiv, die Bedeutung aktiv.' },
  'impersonal active': { de: 'Aktiv (unpersönlich)', explain: 'Ohne bestimmtes Subjekt: „es ist nötig“, „es geschieht“.' },
};

const MOOD: Record<string, Term> = {
  Indicative: { de: 'Indikativ', explain: 'Wirklichkeitsform: Etwas wird als tatsächlich ausgesagt.' },
  Subjunctive: { de: 'Konjunktiv', explain: 'Möglichkeit, Absicht oder Bedingung: „damit …“, „wenn …“, „lasst uns …“.' },
  Optative: { de: 'Optativ', explain: 'Wunschform: „möge es …“.' },
  Imperative: { de: 'Imperativ', explain: 'Befehls- oder Bittform.' },
};

const FORM: Record<string, Term> = {
  Infinitive: { de: 'Infinitiv', explain: 'Die Grundform des Verbs, oft mit „zu …“ übersetzt.' },
  Participle: { de: 'Partizip', explain: 'Ein Verb, das wie ein Adjektiv beschreibt: „der Kommende“, „als er kam“, „nachdem er gekommen war“.' },
};

const CASE: Record<string, Term> = {
  Nominative: { de: 'Nominativ', explain: 'Wer oder was? Meist das Subjekt des Satzes.' },
  Genitive: { de: 'Genitiv', explain: 'Wessen? Zugehörigkeit, Herkunft oder Teil von etwas. Der Bezug ist oft deutungsoffen.' },
  Dative: { de: 'Dativ', explain: 'Wem? Empfänger, Mittel, Ort oder Zeitpunkt.' },
  Accusative: { de: 'Akkusativ', explain: 'Wen oder was? Meist das direkte Objekt, auch Ziel oder Ausdehnung.' },
  Vocative: { de: 'Vokativ', explain: 'Anrede: Jemand wird direkt angesprochen.' },
};

const NUMBER: Record<string, string> = { Singular: 'Einzahl', Plural: 'Mehrzahl' };
const GENDER: Record<string, string> = { Masculine: 'männlich', Feminine: 'weiblich', Neuter: 'sächlich' };

function person(value: string): string | undefined {
  if (value.startsWith('1st')) return '1. Person (ich / wir)';
  if (value.startsWith('2nd')) return '2. Person (du / ihr)';
  if (value.startsWith('3rd')) return '3. Person (er, sie, es / sie)';
}

function tense(value: string): Term | undefined {
  const second = value.startsWith('2nd ');
  const base = TENSE[second ? value.slice(4) : value];
  if (!base) return undefined;
  return second
    ? { de: `${base.de} (starke Form)`, explain: `${base.explain} Die starke Form bildet den Stamm unregelmäßig, die Bedeutung ist dieselbe.` }
    : base;
}

const EXTRA: Record<string, string> = {
  Comparative: 'Vergleichsform (Komparativ)',
  Superlative: 'Höchststufe (Superlativ)',
  Negative: 'verneinend',
  Interrogative: 'fragend',
  Numeral: 'Zahlwort',
  'Abbreviated Numeral': 'Zahlwort',
  Transitive: 'mit Objekt',
};

function nameType(value: string): string | undefined {
  if (/Location/.test(value)) return 'Ortsname';
  if (/Title/.test(value)) return 'Titel';
  if (/Gentilic/.test(value)) return 'Volks- oder Herkunftsbezeichnung';
  if (/Individual|Person/.test(value)) return 'Name einer Person';
}

const cache = new Map<string, GrammarInfo>();

export function describeMorph(code: string): GrammarInfo {
  const hit = cache.get(code);
  if (hit) return hit;
  const parts = getMorphParts(code) ?? {};
  const fn = FUNCTION[parts.Function] ?? { de: parts.Function ?? code, kind: 'other' as const };
  const rows: GrammarRow[] = [{ label: 'Wortart', value: fn.de, explain: fn.explain }];

  const t = parts.Tense ? tense(parts.Tense) : undefined;
  const v = parts.Voice ? VOICE[parts.Voice] : undefined;
  const md = parts.Mood ? MOOD[parts.Mood] : undefined;
  const fm = parts.Form ? FORM[parts.Form] : undefined;
  const c = parts.Case ? CASE[parts.Case] : undefined;
  const p = parts.Person ? person(parts.Person) : undefined;
  const n = parts.Number ? NUMBER[parts.Number] : undefined;
  const g = parts.Gender ? GENDER[parts.Gender] : undefined;

  if (t) rows.push({ label: 'Zeitform', value: t.de, explain: t.explain });
  if (v) rows.push({ label: 'Aktiv/Passiv', value: v.de, explain: v.explain });
  if (md) rows.push({ label: 'Aussageweise', value: md.de, explain: md.explain });
  if (fm) rows.push({ label: 'Form', value: fm.de, explain: fm.explain });
  if (c) rows.push({ label: 'Fall', value: c.de, explain: c.explain });
  if (p) rows.push({ label: 'Person', value: p });
  if (n) rows.push({ label: 'Zahl', value: n });
  if (g) rows.push({ label: 'Geschlecht', value: g, explain: 'Grammatisches Geschlecht; es muss nicht zum Deutschen passen.' });
  const nt = parts['Name type'] ? nameType(parts['Name type']) : undefined;
  if (nt) rows.push({ label: 'Art des Namens', value: nt });
  const ex = parts.Extra ? EXTRA[parts.Extra] : undefined;
  if (ex) rows.push({ label: 'Besonderheit', value: ex });

  let short = fn.de;
  if (fn.kind === 'verb') short = [t?.de.replace(' (starke Form)', ''), fm?.de ?? (md && md.de !== 'Indikativ' ? md.de : undefined)].filter(Boolean).join(' · ') || fn.de;
  else if (c && fn.kind !== 'function') short = c.de;
  else if (fn.de === 'Artikel' && c) short = `Artikel · ${c.de}`;

  const summary = rows
    .filter((r) => r.label !== 'Art des Namens')
    .map((r) => r.value)
    .join(' · ');

  const info: GrammarInfo = { kind: fn.kind, partOfSpeech: fn.de, short, summary, rows };
  cache.set(code, info);
  return info;
}

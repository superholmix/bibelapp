// Baut aus den Quelldaten in pipeline/.cache/ die Markus-Dateien der App:
//   assets/data/mark/chapter-<n>.json  Urtext Wort für Wort + Vergleichsübersetzungen
//   assets/data/lexicon.json           Kurzlexikon für alle Lemmata im Markusevangelium
//   assets/data/morph.json             Aufgeschlüsselte Grammatik-Codes, die in Markus vorkommen
// Aufruf: npm run data:fetch && npm run data:build

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildServerData } from './build-server-data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(here, '.cache');
const outDir = path.join(here, '..', 'assets', 'data');

const BOOK = 'Mrk';
const BOOK_INDEX = 40; // 0-basiert in den scrollmapper-Dateien (Genesis = 0)
// Wörter, die im Nestle-Aland-Text stehen. In den Evangelien ist NA28 wortgleich mit NA27, die
// NA28-Spalte von TAGNT lässt aber eingeklammerte Wörter weg (z. B. 3,14) und vertauscht 1,2.
const BASE_EDITION = 'NA27';

async function readCache(name) {
  return readFile(path.join(cacheDir, name), 'utf8');
}

// "θεοῦ· (theou)" -> { text: "θεοῦ·", translit: "theou" }
function splitGreek(field) {
  const m = field.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? { text: m[1].trim(), translit: m[2].trim() } : { text: field.trim(), translit: '' };
}

// "G2532=CONJ + G1563=ADV" -> [["G2532","CONJ"],["G1563","ADV"]]
function splitPairs(field) {
  return field.split(' + ').map((part) => {
    const i = part.indexOf('=');
    return i < 0 ? [part.trim(), ''] : [part.slice(0, i).trim(), part.slice(i + 1).trim()];
  });
}

function cleanEnglish(s) {
  return s.replace(/[ˍ₊]/g, '').trim();
}

// "βλάψῃ (o=blapsē) it may hurt - G0984=V-AAS-3S in: NA28+NA27+…" → Wortform, Umschrift, Englisch, Grammatik
function baseVariant(column = '') {
  for (const part of column.split(/;\s*/)) {
    const m = part.trim().match(/^(\S+) \((?:\w+=)?([^)]+)\) (.*?) - (\S+) in: (\S+)/);
    if (m && m[5].split('+').includes(BASE_EDITION)) {
      return { text: m[1], translit: m[2], en: m[3], grammar: m[4] };
    }
  }
  return null;
}

function parseTagnt(text) {
  const verses = new Map(); // "1.1" -> words[]
  const refRe = /^Mrk\.(\d+)\.(\d+)(?:[([{][^)\]}]*[)\]}])?#(\d+)=(\S+)$/;
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith(BOOK + '.')) continue;
    const f = line.split('\t');
    const ref = f[0].match(refRe);
    if (!ref) throw new Error('Unbekannte Referenz: ' + f[0]);
    // Einträge wie "NA27»1" markieren nur eine Verknüpfung, das Wort steht trotzdem im Text
    const inBase = (eds) => eds.split('+').some((ed) => ed.replace(/[«»]\d+$/, '') === BASE_EDITION);
    // Manche Zeilen führen die TR-Form und nennen die Nestle-Aland-Form nur in der Variantenspalte (16,18)
    const variant = inBase(f[5]) ? null : baseVariant(f[6]);
    if (!inBase(f[5]) && !variant) continue;
    const [, chapter, verse] = ref;
    // Satzzeichen und Absatzmarke stehen nur an der Hauptform
    const tail = variant ? splitGreek(f[1]).text.match(/[^\p{L}\p{M}]*$/u)[0] : '';
    const greek = variant ? { text: variant.text + tail, translit: variant.translit } : splitGreek(f[1]);
    const grammar = variant ? splitPairs(variant.grammar) : splitPairs(f[3]);
    const lemmas = splitPairs(f[4]);
    const paragraph = greek.text.includes('¶');
    const word = {
      g: greek.text.replace('¶', ''),
      tr: greek.translit,
      en: cleanEnglish(variant ? variant.en : f[2]),
      // Die spanische Spalte wiederholt die Doppelklammern der Markusschlüsse
      es: (f[8] ?? '').replace(/\[\[|\]\]/g, '').trim(),
      s: grammar.map(([strong]) => strong),
      m: grammar.map(([, morph]) => morph),
      l: lemmas.map(([lemma]) => lemma).join(' + '),
      gl: lemmas.map(([, gloss]) => gloss).join(' + '),
    };
    if (paragraph) word.p = 1;
    const key = `${chapter}.${verse}`;
    if (!verses.has(key)) verses.set(key, []);
    verses.get(key).push(word);
  }
  return verses;
}

function cleanDefinition(html) {
  return html
    .replace(/<ref=[^>]*>([^<]*)<\/ref>/g, '$1')
    .replace(/<BR\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/__/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function parseLexicon(text, wanted) {
  const byDStrong = new Map();
  const byBase = new Map(); // erster Eintrag je einfacher Strong-Nummer, als Rückfall
  for (const line of text.split(/\r?\n/)) {
    if (!/^[GH]\d/.test(line)) continue;
    const f = line.split('\t');
    const dStrong = f[1].split('=')[0].trim();
    if (!byDStrong.has(dStrong)) byDStrong.set(dStrong, f);
    if (!byBase.has(f[0])) byBase.set(f[0], f);
  }
  const lexicon = {};
  for (const strong of wanted) {
    const f = byDStrong.get(strong) ?? byBase.get(strong.replace(/[A-Z]$/, ''));
    if (!f) continue;
    const definition = cleanDefinition(f[7] ?? '');
    lexicon[strong] = {
      lemma: f[3],
      tr: f[4],
      gloss: f[6],
      def: definition.length > 900 ? definition.slice(0, 900).replace(/\s+\S*$/, '') + ' …' : definition,
    };
  }
  return lexicon;
}

function parseMorph(text, wanted) {
  const morph = {};
  for (const line of text.split(/\r?\n/)) {
    const f = line.split('\t');
    if (f.length < 2 || !wanted.has(f[0]) || morph[f[0]] || !f[1].includes('Function=')) continue;
    const parts = {};
    for (const pair of f[1].split(/;\s*/)) {
      const i = pair.indexOf('=');
      if (i > 0 && pair.slice(i + 1).trim()) parts[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
    }
    morph[f[0]] = parts;
  }
  return morph;
}

async function loadTranslation(file) {
  const data = JSON.parse(await readCache(file));
  const book = data.books[BOOK_INDEX];
  if (book.name !== 'Mark') throw new Error(`${file}: Buch ${BOOK_INDEX} ist ${book.name}, nicht Mark`);
  const verses = new Map();
  for (const ch of book.chapters) for (const v of ch.verses) verses.set(`${ch.chapter}.${v.verse}`, v.text.trim());
  return verses;
}

async function main() {
  const verses = parseTagnt(await readCache('tagnt.txt'));
  const translations = {
    elb1905: await loadTranslation('elb1905.json'),
    bsb: await loadTranslation('bsb.json'),
    kjv: await loadTranslation('kjv.json'),
    rv1909: await loadTranslation('rv1909.json'),
  };

  const strongs = new Map();
  const morphCodes = new Set();
  for (const words of verses.values())
    for (const w of words) {
      w.s.forEach((s) => strongs.set(s, (strongs.get(s) ?? 0) + 1));
      w.m.forEach((m) => morphCodes.add(m));
    }

  const lexicon = parseLexicon(await readCache('tbesg.txt'), new Set(strongs.keys()));
  for (const [s, count] of strongs) if (lexicon[s]) lexicon[s].n = count;
  const morph = parseMorph(await readCache('tegmc.txt'), morphCodes);

  const missingLex = [...strongs.keys()].filter((s) => !lexicon[s]);
  const missingMorph = [...morphCodes].filter((m) => !morph[m]);
  if (missingLex.length) console.warn('Ohne Lexikoneintrag:', missingLex.join(', '));
  if (missingMorph.length) console.warn('Ohne Grammatik-Aufschlüsselung:', missingMorph.join(', '));

  // Kapitel zusammenstellen; die Verseinteilung folgt TAGNT (NRSV-Zählung).
  const chapters = new Map();
  for (const [key, words] of verses) {
    const [c, v] = key.split('.').map(Number);
    if (!chapters.has(c)) chapters.set(c, []);
    const cmp = {};
    for (const [id, map] of Object.entries(translations)) if (map.has(key)) cmp[id] = map.get(key);
    chapters.get(c).push({ v, words, cmp });
  }

  await mkdir(path.join(outDir, 'mark'), { recursive: true });
  const verseCounts = [];
  for (const [c, list] of [...chapters].sort((a, b) => a[0] - b[0])) {
    list.sort((a, b) => a.v - b.v);
    verseCounts.push(list.length);
    await writeFile(path.join(outDir, 'mark', `chapter-${c}.json`), JSON.stringify({ chapter: c, verses: list }));
  }
  await writeFile(path.join(outDir, 'lexicon.json'), JSON.stringify(lexicon));
  await writeFile(path.join(outDir, 'morph.json'), JSON.stringify(morph));

  const wordCount = [...verses.values()].reduce((n, w) => n + w.length, 0);
  console.log(`Markus: ${chapters.size} Kapitel, ${verses.size} Verse, ${wordCount} Wörter`);
  console.log(`Lexikon: ${Object.keys(lexicon).length} Einträge, Grammatik-Codes: ${Object.keys(morph).length}`);
  console.log('Verse pro Kapitel:', verseCounts.join(' '));
  console.log(`Backend-Daten: ${await buildServerData()} Verse`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

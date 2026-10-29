// Schreibt eine kompakte Fassung des Markus-Textes für die Backend-Funktion „frage“.
// Das Backend baut seine Anfragen an die KI nur aus diesen Daten, nicht aus dem, was die App schickt.
// Ergebnis: supabase/functions/_shared/mark.json
//
//   npm run data:server   (läuft auch am Ende von data:build und ai:translate)

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'assets', 'data');
const OUT = path.join(ROOT, 'supabase', 'functions', '_shared', 'mark.json');

export async function buildServerData() {
  const files = (await readdir(path.join(DATA, 'mark'))).filter((f) => /^chapter-\d+\.json$/.test(f));
  const study = JSON.parse(await readFile(path.join(DATA, 'study-de.json'), 'utf8'));
  const verses = {};
  for (const file of files) {
    const chapter = JSON.parse(await readFile(path.join(DATA, 'mark', file), 'utf8'));
    for (const verse of chapter.verses) {
      const key = `${chapter.chapter}.${verse.v}`;
      verses[key] = {
        // je Wort: Form, Grundform, Grammatik-Code, englische Bedeutung im Zusammenhang
        w: verse.words.map((w) => [w.g, w.l, w.m.join('+'), w.en]),
        elb: verse.cmp.elb1905 ?? '',
        bsb: verse.cmp.bsb ?? '',
        ...(study.verses?.[key]?.text ? { de: study.verses[key].text } : {}),
      };
    }
  }
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ book: 'Mrk', verses }));
  return Object.keys(verses).length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildServerData()
    .then((n) => console.log(`Backend-Daten: ${n} Verse nach ${path.relative(ROOT, OUT)}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

// Lädt die offenen Quelldaten in pipeline/.cache/.
// Die Rohdaten werden nicht ins Repository übernommen: STEPBible bittet darum,
// die Daten nicht selbst weiterzuverteilen, sondern auf github.com/STEPBible zu verweisen.
// In die App kommen nur die daraus erzeugten Markus-Dateien (siehe build-mark.mjs).

import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(here, '.cache');

const STEP = 'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/';
const SCROLLMAPPER = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/';

export const SOURCES = {
  tagnt: STEP + 'Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
  tbesg: STEP + 'Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt',
  tegmc: STEP + 'Morphology codes/TEGMC - Translators Expansion of Greek Morphhology Codes - STEPBible.org CC BY.txt',
  elb1905: SCROLLMAPPER + 'GerElb1905.json',
  bsb: SCROLLMAPPER + 'BSB.json',
  kjv: SCROLLMAPPER + 'KJV.json',
  rv1909: SCROLLMAPPER + 'SpaRV.json',
};

async function exists(file) {
  try {
    return (await stat(file)).size > 0;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(cacheDir, { recursive: true });
  const force = process.argv.includes('--force');
  for (const [key, url] of Object.entries(SOURCES)) {
    const ext = url.endsWith('.json') ? 'json' : 'txt';
    const file = path.join(cacheDir, `${key}.${ext}`);
    if (!force && (await exists(file))) {
      console.log(`✓ ${key} (schon vorhanden)`);
      continue;
    }
    const res = await fetch(encodeURI(url));
    if (!res.ok) throw new Error(`${key}: HTTP ${res.status} für ${url}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    console.log(`↓ ${key}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

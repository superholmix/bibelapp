// Erzeugt die deutsche KI-Studienübersetzung des Markusevangeliums und deutsche Wortbedeutungen
// für die Interlinear-Zeile. Ergebnis: assets/data/study-de.json
//
//   npm run ai:translate -- --chapters 1          nur Kapitel 1
//   npm run ai:translate -- --chapters 1-16       alles (bereits Fertiges wird übersprungen)
//   npm run ai:translate -- --dry-run             zeigt den ersten Auftrag, ohne die API aufzurufen
//   npm run ai:translate -- --force               fertige Abschnitte neu erzeugen

import path from 'node:path';

import { buildServerData } from '../build-server-data.mjs';
import { callJson, DATA, loadChapter, MODEL, parseArgs, pericopes, printTotals, readJson, writeJson } from './lib.mjs';

export const PROMPT_VERSION = 'uebersetzung-v2';
const STUDY_FILE = path.join(DATA, 'study-de.json');

const SYSTEM = `Du übersetzt das Markusevangelium aus dem griechischen Urtext ins Deutsche, für eine Studien-App für Laien.

Ziel: Leserinnen und Leser ohne Theologiestudium sollen so nah wie möglich verstehen, was der griechische Text sagt.

Grundsätze der Übersetzung:
- Urtextnah, aber in alltäglichem heutigem Schriftdeutsch, das auch junge Leserinnen und Leser mühelos verstehen. Keine freie Übertragung: Inhalt und Bildsprache bleiben, Satzbau und Wortwahl passen sich dem Deutschen an.
- Kurze, klare Sätze. Keine altertümlichen Wörter (z. B. „siehe“, „Scheffel“, „Magd“, „gebieten“, „Kunde“, „huldigen“, „Weib“, „wahrlich“).
- Keine konfessionelle Glättung und keine Deutung, die der Text nicht trägt. Wo das Griechische mehrdeutig ist, bleibt die Übersetzung möglichst offen, und eine Fußnote nennt die Möglichkeiten.
- Erzählt wird im Präteritum, auch wo Markus das historische Präsens gebraucht. Das reihende „und“ (καί) am Satzanfang und „sofort“ (εὐθύς) werden nur übersetzt, wo sie im Deutschen natürlich klingen; sonst „da“, „dann“ oder nichts.
- Feste Fachbegriffe (Reich Gottes, Menschensohn, Schriftgelehrte, Pharisäer, Sabbat) bleiben und werden bei Bedarf in einer Fußnote erklärt.
- Gottesname und Titel einheitlich: θεός = „Gott“, κύριος = „Herr“ (bei Zitaten aus der Schrift, wo der Gottesname JHWH gemeint ist: „der Herr“ und Fußnote), υἱὸς τοῦ ἀνθρώπου = „der Menschensohn“, Χριστός = „Christus“ oder „der Messias“ je nach Zusammenhang (Fußnote beim ersten Vorkommen im Abschnitt, wenn die Wahl Gewicht hat).
- Hinzugefügte Wörter, die im Griechischen nicht stehen, aber für das Deutsche nötig sind, stehen in eckigen Klammern [ ].
- Verse 16,9–20 fehlen in den ältesten Handschriften; übersetze sie, aber setze bei 16,9 eine Fußnote dazu.

Fußnoten (notes):
- Nur, wo sie dem Verständnis wirklich helfen: wörtliche Bedeutung, wichtige Alternativen, Grammatik mit Folgen für den Sinn, auffällige Textvarianten, Anspielungen auf das Alte Testament.
- anchor: das Wort oder die kurze Wortgruppe aus deiner deutschen Übersetzung, zu der die Fußnote gehört, exakt so geschrieben wie im Vers.
- text: ein bis zwei kurze Sätze in einfacher Sprache. Fachbegriffe nur mit Erklärung.

Wortbedeutungen (glosses):
- Für jedes griechische Wort des Verses genau ein Eintrag, in derselben Reihenfolge wie in der Eingabe (die Nummern #1, #2 … zeigen die Reihenfolge).
- Kurz (meist 1 bis 3 Wörter), deutsch, die Bedeutung in genau diesem Zusammenhang, passend zur Form (z. B. „er taufte“, „des Evangeliums“, „und“).
- Artikel und Wörter, die man im Deutschen nicht übersetzt, bekommen ihre Grundbedeutung in spitzen Klammern, z. B. „<der>“.

Überschriften (heading): eine kurze, neutrale Abschnittsüberschrift ohne Deutung.

Die beigefügten älteren Übersetzungen dienen nur zum Abgleich. Übersetze selbst aus dem Griechischen und übernimm keine Formulierungen, nur weil sie dort stehen.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['heading', 'verses'],
  properties: {
    heading: { type: 'string' },
    verses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['v', 'text', 'notes', 'glosses'],
        properties: {
          v: { type: 'integer' },
          text: { type: 'string' },
          notes: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['anchor', 'text'],
              properties: { anchor: { type: 'string' }, text: { type: 'string' } },
            },
          },
          glosses: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

function describeWord(word, i) {
  const grammar = word.m.join(' + ');
  return `#${i + 1} ${word.g} (${word.tr}) | Grundform ${word.l} = ${word.gl} | ${grammar} | engl. im Kontext: ${word.en}`;
}

function buildPrompt(chapterNo, verses) {
  const lines = [`Abschnitt: Markus ${chapterNo},${verses[0].v}–${verses.at(-1).v}`, ''];
  for (const verse of verses) {
    lines.push(`## Vers ${chapterNo},${verse.v} (${verse.words.length} Wörter)`);
    verse.words.forEach((w, i) => lines.push(describeWord(w, i)));
    if (verse.cmp.elb1905) lines.push(`Abgleich Elberfelder 1905: ${verse.cmp.elb1905}`);
    if (verse.cmp.bsb) lines.push(`Abgleich Berean Standard Bible: ${verse.cmp.bsb}`);
    lines.push('');
  }
  lines.push('Gib für jeden Vers die Übersetzung, die Fußnoten und die Wortbedeutungen zurück.');
  return lines.join('\n');
}

function validate(result, verses) {
  const problems = [];
  if (result.verses.length !== verses.length) problems.push(`${result.verses.length} statt ${verses.length} Verse`);
  for (const verse of verses) {
    const out = result.verses.find((r) => r.v === verse.v);
    if (!out) {
      problems.push(`Vers ${verse.v} fehlt`);
      continue;
    }
    if (out.glosses.length !== verse.words.length)
      problems.push(`Vers ${verse.v}: ${out.glosses.length} Wortbedeutungen für ${verse.words.length} Wörter`);
    for (const note of out.notes)
      if (!out.text.includes(note.anchor)) problems.push(`Vers ${verse.v}: Fußnoten-Anker „${note.anchor}“ steht nicht im Text`);
  }
  return problems;
}

async function translatePericope(chapterNo, verses, effort) {
  const label = `Mk ${chapterNo},${verses[0].v}-${verses.at(-1).v}`;
  let prompt = buildPrompt(chapterNo, verses);
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { data, model } = await callJson({ system: SYSTEM, prompt, schema: SCHEMA, effort, label });
    const problems = validate(data, verses);
    // Fußnoten mit falschem Anker sind kein Grund für einen neuen Versuch; sie werden verworfen.
    const hard = problems.filter((p) => !p.includes('Anker'));
    if (!hard.length) {
      if (problems.length) console.warn(`  Hinweis ${label}: ${problems.join('; ')}`);
      return { data, model };
    }
    console.warn(`  ${label}, Versuch ${attempt}: ${hard.join('; ')}`);
    prompt += `\n\nACHTUNG, der letzte Versuch war fehlerhaft: ${hard.join('; ')}. Halte die Anzahl der Verse und Wortbedeutungen exakt ein.`;
  }
  throw new Error(`${label}: Ergebnis nach 2 Versuchen unvollständig`);
}

async function main() {
  const args = parseArgs();
  const range = args.chapters ?? { from: 1, to: 16 };
  const study = await readJson(STUDY_FILE, { status: 'pending', verses: {} });
  study.sections ??= {};

  for (let c = range.from; c <= range.to; c++) {
    const chapter = await loadChapter(c);
    for (const verses of pericopes(chapter)) {
      const done = verses.every((v) => study.verses[`${c}.${v.v}`]?.glosses);
      if (done && !args.force) continue;
      if (args.dryRun) {
        console.log('--- SYSTEM ---\n' + SYSTEM + '\n--- AUFTRAG ---\n' + buildPrompt(c, verses));
        const chars = SYSTEM.length + buildPrompt(c, verses).length;
        console.log(`\nGrobe Schätzung: ca. ${Math.round(chars / 3)} Tokens Eingabe für diesen Abschnitt.`);
        return;
      }
      const { data, model } = await translatePericope(c, verses, args.effort);
      for (const verse of verses) {
        const out = data.verses.find((r) => r.v === verse.v);
        study.verses[`${c}.${verse.v}`] = {
          text: out.text,
          notes: out.notes.filter((n) => out.text.includes(n.anchor)),
          glosses: out.glosses,
        };
      }
      study.sections[`${c}.${verses[0].v}`] = data.heading;
      study.status = 'draft';
      study.model = model ?? MODEL;
      study.promptVersion = PROMPT_VERSION;
      await writeJson(STUDY_FILE, study); // nach jedem Abschnitt speichern, damit ein Abbruch nichts kostet
    }
  }
  if (!args.dryRun) await buildServerData(); // Backend bekommt die neue Übersetzung als Kontext
  printTotals();
}

main().catch((err) => {
  console.error(err.message ?? err);
  printTotals();
  process.exit(1);
});

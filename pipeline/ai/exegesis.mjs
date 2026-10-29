// Erzeugt Auslegungsüberblicke für die Streitstellen in exegesis-topics.json.
// Ergebnis: assets/data/exegesis-de.json
//
//   npm run ai:exegesis                 alle noch fehlenden Themen
//   npm run ai:exegesis -- --only mk-15-39
//   npm run ai:exegesis -- --dry-run
//
// Wichtig: Im Testlauf gibt es noch keine kuratierte Quellenbasis. Die Literaturangaben stammen aus dem
// Wissen des Modells und sind deshalb als ungeprüft gekennzeichnet. Für den echten Launch werden sie
// durch geprüfte Exzerpte ersetzt (siehe Planungsdokument, Abschnitt KI-Exegese).

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { callJson, DATA, loadChapter, MODEL, parseArgs, printTotals, readJson, writeJson } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const PROMPT_VERSION = 'auslegung-v1';
const OUT_FILE = path.join(DATA, 'exegesis-de.json');

const SYSTEM = `Du erstellst für eine Bibel-App für Laien einen Überblick über die wissenschaftliche Diskussion zu einer umstrittenen Stelle im Markusevangelium.

Haltung:
- Wissenschaftlich, nicht ideologisch. Du stellst die ernsthaft vertretenen Positionen der Fachexegese fair nebeneinander und fällst kein eigenes Urteil.
- Das Spektrum ist breit: katholische, evangelische, evangelikale, jüdische und historisch-kritische Forschung. Maßstab ist die Methode (Argumentation am Text, an Sprache, Geschichte und Kontext), nicht die Konfession.
- Positionen, die in der Fachdiskussion nur Randmeinungen sind, kennzeichnest du als solche, statt sie gleichrangig darzustellen.

Inhalt:
- question: die Streitfrage in einem Satz, in einfacher Sprache.
- summary: zwei bis drei Sätze, worum es geht und warum es für das Verständnis wichtig ist.
- hinges: ein bis drei Beobachtungen am griechischen Text (Wort, Grammatik, Textvariante, Kontext), an denen sich die Positionen scheiden. Griechische Wörter mit Umschrift und Übersetzung.
- positions: zwei bis vier Positionen. Für jede: ein kurzer Name, die Kernaussage, zwei bis vier Argumente, die wichtigste Textbeobachtung, die Verbreitung in der Forschung (z. B. „Mehrheitsmeinung“, „verbreitet“, „Minderheit“), typische Vertreter und Literatur.
- literature: nur Werke, von denen du sicher bist, dass es sie gibt (Autor, Titel, Erscheinungsjahr). Keine Seitenzahlen. Setze sure auf false, wenn du dir bei Werk oder Zuordnung der Position nicht sicher bist. Lieber weniger Angaben als erfundene.
- Schreibe auf Deutsch, Sätze unter 25 Wörtern, Fachbegriffe nur mit Erklärung.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['question', 'summary', 'hinges', 'positions'],
  properties: {
    question: { type: 'string' },
    summary: { type: 'string' },
    hinges: { type: 'array', items: { type: 'string' } },
    positions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'claim', 'arguments', 'textBasis', 'standing', 'proponents', 'literature'],
        properties: {
          name: { type: 'string' },
          claim: { type: 'string' },
          arguments: { type: 'array', items: { type: 'string' } },
          textBasis: { type: 'string' },
          standing: { type: 'string' },
          proponents: { type: 'array', items: { type: 'string' } },
          literature: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['author', 'title', 'year', 'sure'],
              properties: {
                author: { type: 'string' },
                title: { type: 'string' },
                year: { type: 'string' },
                sure: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
};

async function buildPrompt(topic) {
  const chapter = await loadChapter(topic.chapter);
  const from = Math.max(1, topic.from - 3);
  const lines = [`Stelle: Markus ${topic.chapter},${topic.from}${topic.to !== topic.from ? '–' + topic.to : ''}`, `Leitfrage: ${topic.question}`, '', 'Griechischer Text mit Kontext (NA28-Wortbestand):'];
  for (const verse of chapter.verses.filter((v) => v.v >= from && v.v <= topic.to)) {
    const focus = verse.v >= topic.from ? ' (Stelle)' : ' (Kontext)';
    lines.push(`${topic.chapter},${verse.v}${focus}: ${verse.words.map((w) => w.g).join(' ')}`);
    if (verse.cmp.elb1905) lines.push(`   Elberfelder 1905: ${verse.cmp.elb1905}`);
  }
  return lines.join('\n');
}

async function main() {
  const args = parseArgs();
  const topics = JSON.parse(await readFile(path.join(here, 'exegesis-topics.json'), 'utf8'));
  const out = await readJson(OUT_FILE, { status: 'pending', topics: {} });

  for (const topic of topics) {
    if (args.only && topic.id !== args.only) continue;
    if (out.topics[topic.id] && !args.force) continue;
    const prompt = await buildPrompt(topic);
    if (args.dryRun) {
      console.log('--- SYSTEM ---\n' + SYSTEM + '\n--- AUFTRAG ---\n' + prompt);
      return;
    }
    const { data, model } = await callJson({ system: SYSTEM, prompt, schema: SCHEMA, effort: args.effort, label: topic.id, maxTokens: 24000 });
    out.topics[topic.id] = { id: topic.id, chapter: topic.chapter, from: topic.from, to: topic.to, title: topic.title, ...data, reviewed: false };
    out.status = 'draft';
    out.model = model ?? MODEL;
    out.promptVersion = PROMPT_VERSION;
    await writeJson(OUT_FILE, out);
  }
  printTotals();
}

main().catch((err) => {
  console.error(err.message ?? err);
  printTotals();
  process.exit(1);
});

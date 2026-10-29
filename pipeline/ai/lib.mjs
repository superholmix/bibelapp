// Gemeinsame Bausteine der KI-Pipeline.

import Anthropic from '@anthropic-ai/sdk';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(here, '..', '..');
export const DATA = path.join(ROOT, 'assets', 'data');
const RUNS = path.join(here, 'runs');

export const MODEL = 'claude-opus-5-5';
// Listenpreise in USD je 1 Mio. Tokens (Stand Oktober 2026). Nur für die Kostenanzeige.
const PRICE = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 };

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { chapters: null, effort: 'high', dryRun: false, force: false, only: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--effort') args.effort = argv[++i];
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--chapters') {
      const [from, to] = argv[++i].split('-').map(Number);
      args.chapters = { from, to: to ?? from };
    } else throw new Error(`Unbekannte Option: ${a}`);
  }
  return args;
}

export async function loadChapter(n) {
  return JSON.parse(await readFile(path.join(DATA, 'mark', `chapter-${n}.json`), 'utf8'));
}

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export async function writeJson(file, data) {
  await writeFile(file, JSON.stringify(data, null, 1) + '\n');
}

/**
 * Teilt ein Kapitel in Abschnitte von etwa 6 bis 12 Versen.
 * Grundlage sind die Absatzmarken (¶) aus TAGNT; kurze Absätze werden zusammengelegt.
 */
export function pericopes(chapter, min = 6) {
  const out = [];
  let current = [];
  for (const verse of chapter.verses) {
    current.push(verse);
    const paragraphEnd = verse.words.some((w) => w.p);
    if (paragraphEnd && current.length >= min) {
      out.push(current);
      current = [];
    }
  }
  if (current.length) {
    if (out.length && current.length < min / 2) out[out.length - 1].push(...current);
    else out.push(current);
  }
  return out;
}

let client;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new Error('ANTHROPIC_API_KEY fehlt. Schlüssel in der Anthropic Console anlegen und in .env eintragen (siehe pipeline/README.md).');
  }
  client ??= new Anthropic();
  return client;
}

/**
 * Ein Aufruf mit festem JSON-Schema. Streaming, damit lange Antworten nicht in einen Timeout laufen.
 * Lehnt das Modell aus Sicherheitsgründen ab, übernimmt serverseitig das Standard-Ersatzmodell.
 */
export async function callJson({ system, prompt, schema, effort, maxTokens = 32000, label }) {
  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort, format: { type: 'json_schema', schema } },
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  });
  const message = await stream.finalMessage();
  await logUsage(label, message);
  if (message.stop_reason === 'refusal') throw new Error(`${label}: Anfrage abgelehnt (${message.stop_details?.category ?? 'ohne Kategorie'})`);
  if (message.stop_reason === 'max_tokens') throw new Error(`${label}: Antwort abgeschnitten, max_tokens erhöhen`);
  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return { data: JSON.parse(text), model: message.model };
}

export function costUsd(usage) {
  return (
    ((usage.input_tokens ?? 0) * PRICE.input +
      (usage.output_tokens ?? 0) * PRICE.output +
      (usage.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite +
      (usage.cache_read_input_tokens ?? 0) * PRICE.cacheRead) /
    1e6
  );
}

const totals = { calls: 0, usd: 0, input: 0, output: 0 };

async function logUsage(label, message) {
  const usage = message.usage ?? {};
  const usd = costUsd(usage);
  totals.calls++;
  totals.usd += usd;
  totals.input += (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
  totals.output += usage.output_tokens ?? 0;
  await mkdir(RUNS, { recursive: true });
  const entry = { at: new Date().toISOString(), label, model: message.model, usage, usd: Number(usd.toFixed(4)) };
  await appendFile(path.join(RUNS, 'usage.jsonl'), JSON.stringify(entry) + '\n');
  console.log(`  ${label}: ${usage.input_tokens ?? 0} + ${usage.cache_read_input_tokens ?? 0} (Cache) Tokens rein, ${usage.output_tokens ?? 0} raus, ca. ${usd.toFixed(3)} USD`);
}

export function printTotals() {
  if (!totals.calls) return;
  console.log(
    `\nGesamt: ${totals.calls} Aufrufe, ${totals.input} Tokens rein, ${totals.output} raus, ca. ${totals.usd.toFixed(2)} USD (Protokoll: pipeline/ai/runs/usage.jsonl)`,
  );
}

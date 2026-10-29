// Backend-Funktion „frage“: Live-Fragen an den Text und Wort-Erklärungen.
// Nur für angemeldete Personen mit Abo, mit monatlicher Kostenbremse pro Person.
//
// Geheimnisse (supabase secrets set …): ANTHROPIC_API_KEY
// Optional: AI_MONTHLY_BUDGET_USD (Standard 2.5), AI_MONTHLY_REQUESTS (Standard 300)

import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';

import { adminClient, CORS_HEADERS, currentUser, fail, json, requireEnv } from '../_shared/http.ts';
import { buildPrompt, parseInput, SYSTEM } from './prompt.ts';

const MODEL = 'claude-opus-5-5';
// USD pro Million Tokens: Eingabe, Ausgabe, Cache lesen, Cache schreiben
const PRICE = { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 };

const budgetUsd = Number(Deno.env.get('AI_MONTHLY_BUDGET_USD') ?? '2.5');
const maxRequests = Number(Deno.env.get('AI_MONTHLY_REQUESTS') ?? '300');

let anthropic: Anthropic | null = null;
function claude() {
  anthropic ??= new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY'), timeout: 60_000, maxRetries: 1 });
  return anthropic;
}

function costUsd(usage: Anthropic.Beta.BetaUsage) {
  return (
    (usage.input_tokens * PRICE.input +
      usage.output_tokens * PRICE.output +
      (usage.cache_read_input_tokens ?? 0) * PRICE.cacheRead +
      (usage.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite) /
    1_000_000
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return fail(405, 'method', 'Nur POST');

  const admin = adminClient();
  const user = await currentUser(req, admin);
  if (!user) return fail(401, 'auth', 'Bitte melde dich an.');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'input', 'Ungültige Anfrage');
  }
  const input = parseInput(body);
  if (typeof input === 'string') return fail(400, 'input', input);

  const { data: active, error: entErr } = await admin.rpc('has_active_entitlement', { uid: user.id });
  if (entErr) return fail(500, 'server', 'Abo-Status konnte nicht geprüft werden.');
  if (!active) return fail(403, 'abo', 'Live-Fragen gehören zum Abo.');

  const { data: usageRows, error: useErr } = await admin.rpc('ai_usage_this_month', { uid: user.id });
  if (useErr) return fail(500, 'server', 'Verbrauch konnte nicht geprüft werden.');
  const month = usageRows?.[0] ?? { requests: 0, cost_usd: 0 };
  if (Number(month.cost_usd) >= budgetUsd || Number(month.requests) >= maxRequests) {
    return fail(429, 'limit', 'Das Kontingent für diesen Monat ist aufgebraucht.');
  }

  const prompt = buildPrompt(input);
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await claude().beta.messages.create({
      model: MODEL,
      max_tokens: 6000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt.text }],
    });
  } catch (err) {
    console.error('Claude-Aufruf fehlgeschlagen', err);
    if (err instanceof Anthropic.RateLimitError) return fail(503, 'busy', 'Gerade sind viele Anfragen unterwegs. Bitte gleich noch einmal.');
    return fail(502, 'ai', 'Die KI ist gerade nicht erreichbar.');
  }

  const cost = costUsd(message.usage);
  await admin.from('ai_usage').insert({
    user_id: user.id,
    kind: input.kind,
    ref: prompt.ref,
    input_tokens: message.usage.input_tokens + (message.usage.cache_read_input_tokens ?? 0) + (message.usage.cache_creation_input_tokens ?? 0),
    output_tokens: message.usage.output_tokens,
    cost_usd: cost,
  });

  if (message.stop_reason === 'refusal') {
    return fail(422, 'refusal', 'Auf diese Frage kann ich hier nicht antworten.');
  }
  const answer = message.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n')
    .trim();
  if (!answer) return fail(502, 'ai', 'Die KI hat keine Antwort geliefert. Bitte noch einmal versuchen.');

  return json({
    answer,
    truncated: message.stop_reason === 'max_tokens',
    remaining: Math.max(0, maxRequests - Number(month.requests) - 1),
  });
});

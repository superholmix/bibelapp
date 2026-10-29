// Gemeinsame Bausteine der Backend-Funktionen: CORS, JSON-Antworten, Anmeldung prüfen.

import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.118.0';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Fehler mit festem Code, den die App in einen deutschen Text übersetzt. */
export function fail(status: number, error: string, message: string) {
  return json({ error, message }, status);
}

export function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt`);
  return value;
}

/** Client mit service_role: umgeht RLS, nur im Backend verwenden. */
export function adminClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Liest die angemeldete Person aus dem Authorization-Header, sonst null. */
export async function currentUser(req: Request, admin: SupabaseClient): Promise<User | null> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/** Vergleich in konstanter Zeit, damit Geheimnisse nicht über Laufzeiten erraten werden können. */
export function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

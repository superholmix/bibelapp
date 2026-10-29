// Backend-Funktion „revenuecat“: Webhook von RevenueCat. Bei jedem Abo-Ereignis fragt sie den
// aktuellen Stand bei RevenueCat ab und schreibt ihn nach public.entitlements. So ist die Datenbank
// die Quelle, auf die sich „frage“ verlässt, und Ereignisse in falscher Reihenfolge schaden nicht.
//
// Geheimnisse: REVENUECAT_WEBHOOK_AUTH (derselbe Wert wie im RevenueCat-Dashboard unter
// „Authorization header value“), REVENUECAT_SECRET_KEY (geheimer API-Schlüssel, v1).
// Optional: REVENUECAT_ENTITLEMENT (Standard „abo“), REVENUECAT_API_URL (nur für Tests)

import { adminClient, fail, json, requireEnv, safeEqual } from '../_shared/http.ts';

const ENTITLEMENT = Deno.env.get('REVENUECAT_ENTITLEMENT') ?? 'abo';
const API_URL = Deno.env.get('REVENUECAT_API_URL') ?? 'https://api.revenuecat.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RcEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
};

type RcSubscriber = {
  subscriber: {
    entitlements: Record<string, { expires_date: string | null; product_identifier: string }>;
    subscriptions: Record<string, { unsubscribe_detected_at: string | null }>;
  };
};

/** Alle Konten (Supabase-IDs), die das Ereignis betrifft. Anonyme RevenueCat-IDs fallen heraus. */
function affectedUsers(event: RcEvent) {
  const ids = [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
    ...(event.transferred_from ?? []),
    ...(event.transferred_to ?? []),
  ];
  return [...new Set(ids.filter((id): id is string => !!id && UUID.test(id)))];
}

async function fetchSubscriber(userId: string): Promise<RcSubscriber> {
  const res = await fetch(`${API_URL}/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${requireEnv('REVENUECAT_SECRET_KEY')}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`RevenueCat antwortet mit ${res.status}`);
  return (await res.json()) as RcSubscriber;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'method', 'Nur POST');
  const auth = req.headers.get('Authorization') ?? '';
  if (!safeEqual(auth, requireEnv('REVENUECAT_WEBHOOK_AUTH'))) return fail(401, 'auth', 'Nicht berechtigt');

  let event: RcEvent;
  try {
    event = ((await req.json()) as { event?: RcEvent }).event ?? {};
  } catch {
    return fail(400, 'input', 'Ungültiger Inhalt');
  }
  if (event.type === 'TEST') return json({ ok: true, test: true });

  const admin = adminClient();
  const users = affectedUsers(event);
  for (const userId of users) {
    let sub: RcSubscriber;
    try {
      sub = await fetchSubscriber(userId);
    } catch (err) {
      console.error(err);
      // 5xx: RevenueCat wiederholt den Webhook später
      return fail(502, 'revenuecat', 'RevenueCat nicht erreichbar');
    }
    const ent = sub.subscriber.entitlements?.[ENTITLEMENT];
    if (ent) {
      const willRenew = !sub.subscriber.subscriptions?.[ent.product_identifier]?.unsubscribe_detected_at;
      // Von Hand freigeschaltete Testkonten nicht überschreiben
      const { data: existing } = await admin.from('entitlements').select('source').eq('user_id', userId).maybeSingle();
      if (existing?.source === 'manual') continue;
      const { error } = await admin.from('entitlements').upsert({
        user_id: userId,
        source: 'revenuecat',
        product_id: ent.product_identifier,
        expires_at: ent.expires_date,
        will_renew: willRenew,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        // Konto gibt es (noch) nicht oder nicht mehr: nichts zu tun
        if (error.code === '23503') continue;
        console.error(error);
        return fail(500, 'db', 'Speichern fehlgeschlagen');
      }
    } else {
      await admin.from('entitlements').delete().eq('user_id', userId).eq('source', 'revenuecat');
    }
  }
  return json({ ok: true, users: users.length });
});

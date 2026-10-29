// Backend-Funktion „konto-loeschen“: löscht das eigene Konto mit allen Notizen, Abo-Status und
// Verbrauchsdaten (über ON DELETE CASCADE). Pflicht für App Store und Google Play.
// Ein laufendes Store-Abo kündigt das nicht; darauf weist die App vorher hin.
//
// Optional: REVENUECAT_SECRET_KEY, dann werden auch die Daten bei RevenueCat gelöscht.

import { adminClient, CORS_HEADERS, currentUser, fail, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return fail(405, 'method', 'Nur POST');

  const admin = adminClient();
  const user = await currentUser(req, admin);
  if (!user) return fail(401, 'auth', 'Bitte melde dich an.');

  const rcKey = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (rcKey) {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${rcKey}` },
    });
    if (!res.ok && res.status !== 404) console.error('RevenueCat-Löschung fehlgeschlagen', res.status);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(error);
    return fail(500, 'server', 'Das Konto konnte nicht gelöscht werden.');
  }
  return json({ ok: true });
});

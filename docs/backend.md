# Backend: Konto, Notizen, Abo und Live-Fragen

Die App läuft auch ganz ohne Backend: Dann bleiben die Notizen auf dem Gerät, und es gibt keine Live-Fragen. Sobald die Werte in `.env` stehen, kommen Konto, Synchronisation und Abo dazu.

## Überblick

| Teil | Wo | Aufgabe |
| --- | --- | --- |
| Anmeldung | Supabase Auth | Code per E-Mail, kein Passwort |
| Notizen | Tabelle `notes` | Synchronisation zwischen Geräten, die letzte Änderung gewinnt |
| Abo-Status | Tabelle `entitlements` | Schreibt nur das Backend (Webhook von RevenueCat oder von Hand) |
| KI-Verbrauch | Tabelle `ai_usage` | Kosten pro Anfrage, Grundlage der Kostenbremse |
| `frage` | Edge Function | Live-Fragen an den Text und Wort-Erklärungen über die Claude-API |
| `revenuecat` | Edge Function | Webhook: holt bei jedem Abo-Ereignis den Stand bei RevenueCat und schreibt ihn in `entitlements` |
| `konto-loeschen` | Edge Function | Löscht das eigene Konto samt Daten (Pflicht für die Stores) |

Schema und Zugriffsregeln: [`supabase/migrations/`](../supabase/migrations/). Jede Person sieht nur ihre eigenen Zeilen; der Abo-Status kann aus der App heraus nicht geändert werden.

Der Claude-Schlüssel liegt nur als Geheimnis in Supabase, nie in der App. Die Funktion `frage` baut die Anfrage an die KI aus den eigenen Markus-Daten (`supabase/functions/_shared/mark.json`, erzeugt mit `npm run data:server`) und nimmt von der App nur Kapitel, Vers, Wortnummer und Frage an.

## 1. Supabase einrichten

1. Auf [supabase.com](https://supabase.com) ein Projekt anlegen, Region **Central EU (Frankfurt)**.
2. In der Projektübersicht **Connect** (oder Project Settings > API Keys) öffnen und die **Project URL** und den **anon** bzw. **publishable** Schlüssel in `.env` eintragen (Vorlage: `.env.example`):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```

   Diese beiden Werte sind öffentlich und dürfen in die App. Den **service_role**- bzw. **secret**-Schlüssel nie in die App oder ins Repo.
3. Mit der Supabase-CLI verbinden und alles hochladen (`npx` lädt die CLI beim ersten Mal):

   ```bash
   npx supabase login
   npx supabase link --project-ref xxxx          # xxxx aus der Project URL
   npx supabase db push                          # Tabellen und Zugriffsregeln
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy frage konto-loeschen revenuecat
   ```

4. Unter **Authentication > Emails** die Vorlagen „Magic Link“ und „Confirm signup“ durch den Inhalt von [`supabase/templates/anmeldecode.html`](../supabase/templates/anmeldecode.html) ersetzen. Wichtig ist `{{ .Token }}`: Die App fragt den 6-stelligen Code ab, nicht den Link. (`supabase config push` bitte nicht verwenden: Es würde die lokalen Testwerte aus `supabase/config.toml` auf das echte Projekt übertragen.)
5. Für mehr als ein paar Test-E-Mails pro Stunde unter **Authentication > SMTP** einen eigenen Mailversand eintragen (z. B. Brevo oder Postmark, beide mit EU-Option).

### Testkonten freischalten

Solange es noch kein Store-Abo gibt, schaltest du Konten von Hand frei. Im Supabase-Dashboard unter **SQL Editor**:

```sql
insert into public.entitlements (user_id, source)
select id, 'manual' from auth.users where email = 'name@example.org';
```

Wieder sperren: `delete from public.entitlements where source = 'manual' and user_id = (select id from auth.users where email = 'name@example.org');`

### Kostenbremse

Pro Person und Kalendermonat gelten standardmäßig höchstens **2,50 USD** KI-Kosten und **300 Anfragen**. Eine Wort-Erklärung oder Frage kostet bei Claude Opus 5.5 mit niedrigem Aufwand rund 1 bis 3 Cent; Wort-Erklärungen werden auf dem Gerät gespeichert und kosten beim zweiten Mal nichts. Ändern mit:

```bash
npx supabase secrets set AI_MONTHLY_BUDGET_USD=3 AI_MONTHLY_REQUESTS=400
```

Verbrauch ansehen: `select date_trunc('day', created_at), kind, count(*), sum(cost_usd) from ai_usage group by 1, 2 order by 1 desc;`

## 2. RevenueCat und Stores (für echte Käufe)

Echte Käufe gehen nur in einem Entwicklungs-Build oder der fertigen App, nicht in Expo Go und nicht im Browser. Für den Testlauf reicht das manuelle Freischalten oben.

1. **App Store Connect** und **Google Play Console**: App anlegen (Bundle-ID `com.superholmix.bibelapp`), je zwei Abos anlegen, z. B. `abo_monat` (6,99 €) und `abo_jahr` (59,99 €) in einer Abo-Gruppe.
2. **RevenueCat**: Projekt anlegen, beide Stores verbinden, die Produkte importieren.
   - Entitlement mit der ID **`abo`** anlegen und beide Produkte zuordnen.
   - Ein Offering als „Current“ markieren und die Pakete Monthly und Annual zuordnen. Die App zeigt genau diese Pakete.
3. Öffentliche App-Schlüssel (`appl_…`, `goog_…`) in `.env` eintragen:

   ```
   EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
   ```

4. Webhook einrichten: In RevenueCat unter **Integrations > Webhooks** die URL `https://xxxx.supabase.co/functions/v1/revenuecat` eintragen und als **Authorization header value** einen langen Zufallswert setzen, z. B. `Bearer <zufall>`. Dann:

   ```bash
   npx supabase secrets set REVENUECAT_WEBHOOK_AUTH="Bearer <zufall>" REVENUECAT_SECRET_KEY=sk_...
   ```

   `REVENUECAT_SECRET_KEY` ist ein geheimer API-Schlüssel (v1) aus RevenueCat > API keys. Mit „Send test event“ prüfen; die Funktion antwortet mit `{"ok":true,"test":true}`.
5. Entwicklungs-Build bauen: `npx eas build --profile development` (braucht ein Expo-Konto). Die App meldet sich bei RevenueCat mit der Supabase-Konto-ID an, darüber findet der Webhook die Person.

## Lokal testen

`supabase start` braucht Docker. Ohne Docker lassen sich die Funktionen mit Deno prüfen:

```bash
cd supabase/functions && deno check frage/index.ts revenuecat/index.ts konto-loeschen/index.ts
```

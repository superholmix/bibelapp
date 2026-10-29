# Daten-Pipeline

Zwei Teile:

1. **Urtext-Daten** (`fetch-sources.mjs`, `build-mark.mjs`): bauen Text, Lexikon und Grammatik aus offenen Quellen. Kein API-Schlüssel nötig.
2. **KI-Inhalte** (`ai/`): erzeugen mit der Claude-API die deutsche Studienübersetzung, die deutschen Wortbedeutungen und die Auslegungsüberblicke. Das Ergebnis landet als feste Daten in `assets/data/`; die App selbst ruft die API nie auf.

Voraussetzung: Node.js 22 oder neuer.

## Urtext-Daten

```bash
npm run data:fetch   # lädt die Quellen nach pipeline/.cache/ (wird nicht eingecheckt)
npm run data:build   # schreibt assets/data/mark/, lexicon.json, morph.json
```

## KI-Inhalte

### Einmalig: API-Schlüssel

1. In der [Anthropic Console](https://console.anthropic.com/) anmelden, unter **Billing** Guthaben aufladen (für den Markus-Testlauf reichen rund 20 USD, empfohlen sind 50 USD für Wiederholungen und Tests).
2. Unter **API Keys** einen Schlüssel anlegen.
3. Im Projektordner eine Datei `.env` anlegen:

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

   `.env` steht in `.gitignore` und darf nie eingecheckt werden. Der Schlüssel gehört nie in die App.

### Ausführen

Immer erst klein anfangen und das Ergebnis in der App ansehen:

```bash
npm run ai:translate -- --chapters 1 --dry-run   # zeigt den Auftrag, ohne die API aufzurufen
npm run ai:translate -- --chapters 1             # Kapitel 1 übersetzen
npm run ai:translate -- --chapters 2-16          # den Rest
npm run ai:exegesis                               # Auslegungsüberblicke für alle Streitstellen
npm run ai:exegesis -- --only mk-1-1              # nur eine Streitstelle
```

Weitere Schalter: `--force` erzeugt fertige Abschnitte neu, `--effort medium` spart Tokens auf Kosten der Gründlichkeit.

Die Skripte speichern nach jedem Abschnitt. Bricht ein Lauf ab, einfach neu starten; Fertiges wird übersprungen. Jeder Aufruf wird mit Tokens und Kosten in `pipeline/ai/runs/usage.jsonl` protokolliert, am Ende steht eine Summe.

### Kosten (Schätzung)

| Lauf | Umfang | Kosten |
| --- | --- | --- |
| Studienübersetzung + Wortbedeutungen | 83 Abschnitte, 673 Verse | ca. 0,13 USD pro Abschnitt, gesamt ca. 11 USD |
| Auslegungsüberblicke | 9 Streitstellen | ca. 0,30 USD pro Stelle, gesamt ca. 3 USD |

Nach Kapitel 1 die echte Summe aus der Ausgabe nehmen und hochrechnen.

### Stand der Daten

Die Studienübersetzung in `assets/data/study-de.json` (alle 83 Abschnitte) ist nicht über die API entstanden, sondern Abschnitt für Abschnitt in einer Claude-Code-Sitzung, nach denselben Regeln wie im Auftrag von `ai/translate.mjs`. Sie trägt deshalb das Modellfeld „Claude (Claude-Code-Sitzung)“. Weil alle Abschnitte fertig sind, überspringt `npm run ai:translate` sie; `--force` würde sie über die API neu erzeugen und überschreiben.

### Qualität prüfen

- Die Übersetzung trägt den Status `draft`. Die App zeigt dann den Hinweis „KI-Entwurf“.
- Auslegungen tragen `reviewed: false`. **Literaturangaben sind nicht geprüft**: Die KI markiert unsichere Titel mit `sure: false`, aber auch „sichere“ Angaben müssen vor einer Veröffentlichung nachgeschlagen werden.
- Streitstellen stehen in `ai/exegesis-topics.json` und lassen sich dort ergänzen.

# Bibel-App

Eine App, die Bibelleser ohne theologisches Vorwissen nah an den Urtext bringt und das Spektrum wissenschaftlicher Auslegung zeigt.

Aktuell läuft der **Testlauf mit dem Markusevangelium**: Lesen, Urtext Wort für Wort, Wortbedeutung und Grammatik in Alltagssprache, Vergleichsübersetzungen und Notizen. Konto, Abo und die KI-Funktionen folgen als nächste Schritte. Der Gesamtplan steht im [Planungsdokument](https://claude.ai/artifact/SYj5KDrZ1wwBhguihFjavb), eine Kurzfassung in [docs/plan.md](docs/plan.md).

## Starten

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm start          # danach "i" für iOS-Simulator, "a" für Android, "w" für den Browser
```

Auf dem eigenen Handy geht es am schnellsten mit der App **Expo Go**: QR-Code aus `npm start` scannen.

Prüfen vor jedem Commit:

```bash
npm run typecheck
```

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/app/` | Screens (Expo Router): `index` Lesen, `notizen`, `mehr` |
| `src/components/` | Bausteine wie Interlinear-Vers, Wort-Blatt, Notiz-Blatt |
| `src/data/mark.ts` | Zugriff auf Text, Lexikon und Grammatik |
| `src/lib/grammar.ts` | Grammatik-Codes in Alltagssprache |
| `src/state/` | Einstellungen und Notizen (lokal gespeichert) |
| `assets/data/` | Erzeugte Markus-Daten, nicht von Hand bearbeiten |
| `pipeline/` | Skripte, die die Daten aus offenen Quellen bauen |

## Daten neu bauen

```bash
npm run data:fetch   # lädt die Quelldaten nach pipeline/.cache/
npm run data:build   # schreibt assets/data/
```

Quellen und Lizenzen: [docs/datenquellen.md](docs/datenquellen.md).

# Plan in Kürze

Das vollständige Planungsdokument liegt hier: <https://claude.ai/artifact/SYj5KDrZ1wwBhguihFjavb>

## Testlauf: Markusevangelium

Vor dem großen Ausbau entsteht eine App nur mit dem Markusevangelium, aber mit allen Kernfunktionen. Ziel: Qualität und Kosten pro Vers echt messen und die Bedienung testen.

| Schritt | Inhalt | Stand |
| --- | --- | --- |
| 1 | App-Gerüst, Markus-Daten, Lesen, Urtext, Wort-Blatt, Vergleich, Notizen (lokal) | erledigt |
| 2 | KI-Pipeline: deutsche Studienübersetzung, deutsche Wortbedeutungen, Auslegungsüberblick für 5 bis 10 Streitstellen | offen |
| 3 | Konto (Supabase), Notizen synchronisieren, Abo-Sperre (RevenueCat), Live-Frage an den Text über das Backend | offen |

## Technik

- Expo (React Native) mit TypeScript und Expo Router, später auch als Web-App
- Supabase (EU) für Konto, Notizen und Backend-Funktionen
- RevenueCat für Abos über App Store und Google Play
- Claude-API nur über das Backend; Inhalte werden vorab erzeugt und als feste Daten ausgeliefert

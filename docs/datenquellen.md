# Datenquellen und Lizenzen

Stand: 29.10.2026. Vor einer Veröffentlichung im Store noch einmal juristisch prüfen.

| Daten | Quelle | Lizenz | Pflichten |
| --- | --- | --- | --- |
| Griechischer Text Wort für Wort, Umschrift, englische und spanische Wortübersetzung, Strong-Nummern, Grammatik | STEPBible **TAGNT** (Translators Amalgamated Greek NT) | CC BY 4.0 | Nennung „STEP Bible“ mit Link auf www.STEPBible.org; Änderungen an den Daten offenlegen; Rohdaten nicht selbst weiterverteilen, sondern auf github.com/STEPBible verweisen |
| Kurzlexikon (Abbott-Smith, ergänzt) | STEPBible **TBESG** | CC BY 4.0 | wie oben |
| Aufschlüsselung der Grammatik-Codes | STEPBible **TEGMC** | CC BY 4.0 | wie oben |
| Elberfelder 1905 | scrollmapper/bible_databases | gemeinfrei | keine |
| King James Version | scrollmapper/bible_databases | gemeinfrei (in Großbritannien Kronrecht) | für Vertrieb in UK prüfen |
| Reina-Valera 1909 | scrollmapper/bible_databases | gemeinfrei | keine |
| Berean Standard Bible | scrollmapper/bible_databases | CC0 | keine |

## Welcher griechische Text?

Die App zeigt die Wörter, die TAGNT als Teil von **NA27/NA28** (Nestle-Aland) markiert. In den Evangelien sind beide Auflagen wortgleich; das Skript nimmt die NA27-Spalte, weil der NA28-Spalte von TAGNT in Markus eingeklammerte Wörter fehlen (z. B. 3,14) und sie in 1,2 „ich“ statt „siehe“ führt. Das ist der Wortbestand, dem fast alle modernen Übersetzungen folgen. Der NA28-Text selbst ist urheberrechtlich geschützt; TAGNT ist eine eigenständige, offen lizenzierte Zusammenstellung mit Rechtschreibung nach NA28. Deshalb fehlen die Verse Mk 7,16; 9,44; 9,46; 11,26 und 15,28, die nur in späteren Handschriften stehen (673 statt 678 Verse).

## Bewusst nicht verwendet

- **SBLGNT**: steht unter einer eigenen Endnutzer-Lizenz (EULA), nicht unter einer offenen Lizenz. Vor einer Nutzung die Bedingungen klären.
- **Schlachter 1951**: urheberrechtlich geschützt, nur nichtkommerzielle Weitergabe erlaubt.
- **Luther 1912**: in den genutzten Quellen nicht verfügbar; kann später ergänzt werden.

## Änderungen an STEPBible-Daten

`pipeline/build-mark.mjs` wählt nur Wörter mit NA27 aus (auch solche mit Verweiszeichen wie „NA27»1“), entfernt Absatzzeichen (¶) und Hilfszeichen (ˍ ₊) aus den Wortübersetzungen, entfernt HTML aus den Lexikoneinträgen und kürzt diese auf etwa 900 Zeichen. Inhaltlich wird nichts verändert.

---
name: kosten-analyse
description: Analysiert einen deutschen Kontoauszug (CSV) auf Abos und wiederkehrende Kosten, priorisiert Kündigungs-Kandidaten und gibt eine Bewertung mit Sparpotenzial. Verwende diesen Skill, wenn der User seinen Kontoauszug/seine Abos/Fixkosten auswerten lassen will – Trigger: "analysiere meinen Kontoauszug", "welche Abos kann ich kündigen", "wofür gebe ich Geld aus", "kosten-analyse", "was kostet mich am meisten", "wo kann ich sparen", "Fixkosten checken". NICHT für allgemeine Finanzberatung ohne Kontoauszug-Datei.
---

# Kosten-Analyse aus dem Kontoauszug

Hilft dem User, aus seinem Bank-CSV die wiederkehrenden Kosten zu verstehen,
zu priorisieren und eine klare Bewertung + Sparplan zu bekommen.

## ⚠️ Zwei eiserne Regeln (zuerst lesen)

1. **NIEMALS die Roh-CSV mit `Read`/`cat` öffnen oder ihren Inhalt ausgeben.**
   Die CSV enthält Gehalt, IBANs, jeden Einzelkauf. Lass die lokale CLI das
   Parsen machen – sie liefert NUR die erkannten Abos zurück, nicht den ganzen
   Auszug. So gelangt das Minimum an Daten in den Kontext.
2. **Privacy transparent machen:** Sobald du die Analyse auswertest, landet die
   Abo-Zusammenfassung (Anbieter + Beträge) in diesem Claude-Kontext (= bei
   Anthropic). Das ist okay, weil der User es will – aber sag es einmal kurz.
   Wenn der User maximale Diskretion will: mit `--redact` laufen lassen
   (Anbieter werden zu "Anbieter A/B/C"; dann keine Anbieter-spezifische Beratung).

## Schritt 1 — Analyse erzeugen (deterministisch, lokal)

Frag nach dem Pfad zur CSV, falls nicht genannt. Dann im waskostetmich-Repo:

```bash
npm run analyze --silent -- "<pfad/zur/auszug.csv>" --json
```

Optional `--redact` anhängen für pseudonymisierte Anbieter.
Das JSON enthält `meta`, `zusammenfassung` und `abos[]` (mit `monatlich`,
`jaehrlich`, `frequenz`, `vertrauen`, `status` aktiv/eingeschlafen,
`sepaLastschrift`, `preiserhoehung?`). Falls "Format nicht erkannt": prüfen, ob
es ein echter CSV-Umsatz-Export ist (nicht PDF), und welche Bank.

## Schritt 2 — Auswerten (hier bist DU dran, nicht die CLI)

Die CLI liefert Fakten. Deine Aufgabe ist das Urteil:

1. **Priorisieren nach Jahreskosten** – größte Hebel zuerst (`jaehrlich` absteigend).
2. **Überlappungen erkennen** (das kann die Engine nicht): mehrere Dienste
   derselben Kategorie = Sparpotenzial durch Zusammenstreichen. Kategorien:
   - Streaming-Video (Netflix, Disney+, Amazon Prime Video, WOW, Paramount+, DAZN)
   - Musik (Spotify, Apple Music, Amazon Music, Deezer)
   - Cloud/Storage (iCloud, Google One, Dropbox)
   - News/Lesen (Zeitungen, Audible, Kindle, Blinkist)
   - Software/SaaS (Adobe, Microsoft 365, ChatGPT, Notion)
   - Fitness, Versicherungen, Telekom/Mobilfunk, Lieferdienste
3. **Preiserhöhungen markieren** (`preiserhoehung`): „schleichend teurer". Allgemeiner
   Hinweis möglich, dass bei unwirksamen Erhöhungen ein Sonderkündigungsrecht
   oder eine Rückforderung bestehen *kann* (KG Berlin/BGH Netflix-Urteil) –
   **ohne** den Einzelfall rechtlich zu bewerten (siehe RDG unten).
4. **`eingeschlafen` prüfen**: evtl. schon gekündigt – oder bei Jahresabos steht
   die nächste Buchung bevor. Nachfragen statt annehmen.
5. **Essenzielles vs. echte Abos trennen**: Strom/Wasser/Versicherung/Miete sind
   meist Pflicht (oft `variabel` + `sepaLastschrift`), kein Streich-Kandidat.
   Echte „Lifestyle"-Abos (Streaming, Fitness, SaaS) sind die Hebel.

## Schritt 3 — Bewertung + Sparplan ausgeben

Liefere kompakt:

- **Gesamtbild**: „X wiederkehrende Zahlungen = Y €/Monat (Z €/Jahr)."
- **Bewertung** (1 Satz Einordnung + Sparpotenzial in €/Jahr), z. B.
  „Größter Hebel: 2 Streaming-Dienste parallel – einer reicht, spart ~120 €/Jahr."
- **Kündigen-Kandidaten** (priorisiert, mit jeweiligem €/Jahr-Effekt und kurzer Begründung).
- **Behalten** (kurz, was sinnvoll bleibt).
- **Summe Sparpotenzial /Jahr** wenn der User allen Vorschlägen folgt.

Halte es konkret und entscheidungsreif (Tabelle ist gut). Keine generischen
Spartipps, die nicht aus den Daten kommen.

## Schritt 4 — Optional: Kündigung entwerfen

Wenn gewünscht, entwirf eine **allgemeine** Kündigungs-Vorlage (Anbieter, Vertrag,
Datum, „zum nächstmöglichen Zeitpunkt", Bestätigung erbitten). Bei Preiserhöhung
optional Hinweis auf Sonderkündigungsrecht – allgemein gehalten.

## RDG: keine Rechtsberatung

Schematisch und allgemein bleiben. **Nicht** den konkreten Einzelfall rechtlich
würdigen („Ihre Erhöhung ist rechtswidrig, kündigen Sie fristlos"), keine
Erfolgsversprechen. Bei rechtlichen Fragen auf Verbraucherzentrale / Anwalt
verweisen. Das Tool ist Information, keine Rechts- oder Finanzberatung.

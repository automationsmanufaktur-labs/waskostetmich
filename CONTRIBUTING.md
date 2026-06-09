# Mitmachen bei WasKostetMich

Danke, dass du beitragen möchtest! 🙌 Dieses Projekt lebt von zwei Dingen:
**mehr Bankformate** und **bessere Erkennung**.

## Grundregeln (nicht verhandelbar)

1. **100 % client-side.** Es darf niemals Code hinzugefügt werden, der Kontodaten
   überträgt. Kein `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon` mit Nutzerdaten,
   keine externen Fonts/CDNs/Analytics. Die Privacy-Garantie ist der Kern des Projekts.
2. **Kein `any`.** TypeScript strict. Nutze `unknown` und narrowe.
3. **Keine echten Kontodaten** in Tests, Fixtures, Issues oder Screenshots. Nur
   synthetische/anonymisierte Beispiele.

## Setup

```bash
npm install
npm run dev          # Dev-Server
npm test             # Tests (müssen grün bleiben)
npm run build        # muss durchlaufen
```

## Bevor du einen PR öffnest

- [ ] `npm test` ist grün
- [ ] `npm run build` läuft fehlerfrei durch (inkl. `tsc --noEmit`)
- [ ] Neue Logik hat einen Test (gegen eine Fixture, keine echten Daten)
- [ ] Keine neuen Netzwerk-Abhängigkeiten

## Womit du am meisten hilfst

### 🏦 Neues Bankformat

Die häufigste und wertvollste Hilfe. Schritt-für-Schritt-Anleitung:
**[docs/bank-format-beitragen.md](docs/bank-format-beitragen.md)**

### 🎯 Erkennung verbessern

Die Detection-Engine liegt in `src/detect/`. Wenn du einen Fehlalarm oder eine
nicht erkannte wiederkehrende Zahlung findest:

1. Baue eine **synthetische** Fixture nach, die den Fall reproduziert.
2. Schreibe einen Test in `tests/detect.test.ts`, der den gewünschten Soll-Zustand prüft.
3. Passe die Heuristik an, bis der Test grün ist – ohne andere Tests zu brechen.

Relevante Stellschrauben in `src/detect/detect.ts` (`DetectOptions`):
`similarityThreshold`, `confirmThreshold`, `maxIntervalStd`, `variableSpread`.

## Projektstruktur

```
src/
  core/        Datei-Parsing: Encoding, CSV, deutsche Formate, Bank-Profile, SEPA
  detect/      Erkennungslogik: Normalisierung, Intervall, Preis, Gruppierung
  ui/          DOM-Rendering, Formatierung, Demo-Daten
tests/         Vitest + synthetische Fixtures pro Bank
docs/          Beitrags-Guides
```

## Stil

- Funktionen klein und benannt; Kommentare erklären das **Warum**, nicht das Was.
- Deutsche Bezeichnungen in der UI, englische Variablennamen im Code sind ok.
- Formatierung wie im umliegenden Code.

# Claude Code — WasKostetMich

OSS-Tool, das aus einem deutschen Kontoauszug (CSV) Abos & wiederkehrende
Abbuchungen erkennt – inkl. „schleichend teurer". **100 % client-side**, keine
Daten verlassen das Gerät. Vanilla TS + Vite, einzige Runtime-Dep: Zod.

## ⚠️ Wichtigste Regel

**Niemals eine Kontoauszug-CSV mit `Read`/`cat` öffnen.** Sie enthält Gehalt,
IBANs, jeden Einzelkauf. Zum Auswerten immer die CLI nutzen – sie parst lokal
und gibt nur die erkannten Abos zurück:

```bash
npm run analyze --silent -- "<pfad.csv>" --json   # --redact für pseudonyme Namen
```

Für die Auswertung/Beratung gibt es den Skill **`kosten-analyse`** (Priorisierung,
Bewertung, RDG-sichere Hinweise). Den nutzen, wenn der User seine Kosten/Abos
auswerten lassen will.

## Architektur

```
src/core/    Datei→Transaktion: encoding (UTF-8-BOM/UTF-8/cp1252), RFC-4180-CSV,
             de-format, bank-profiles (header-basiert), sepa, parse  →  Zod-Modell
src/detect/  Erkennung: normalize (token-set-sim), interval, price, detect, stats
src/ui/      Browser-App (DOM, XSS-sicher via textContent), demo-data
src/cli.ts   Terminal-CLI (Report + --json)  ·  src/cli/ (analysis, report)
tests/       Vitest + synthetische Fixtures (NIE echte Kontodaten)
```

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Browser-App (Dev) |
| `npm run analyze -- <csv> [--json] [--redact]` | CLI-Analyse |
| `npm test` | Unit-Tests (müssen grün bleiben) |
| `npm run build` | statische Seite → `dist/` |
| `npm run build:standalone` | eine self-contained `index.html` (file://-tauglich) |

## Konventionen

- TypeScript strict, **kein `any`** (use `unknown`). Zod an Datei-/Eingabe-Grenzen.
- Deterministische Engine = Fakten (parsen, erkennen). LLM/Claude = Urteil
  (priorisieren, Überlappungen, Bewertung). Diese Trennung beibehalten.
- Privacy ist nicht verhandelbar: kein `fetch`/XHR/WebSocket/Beacon, keine
  externen Assets. CSP `connect-src 'none'` erzwingt das zusätzlich.
- Tests/Fixtures: ausschließlich synthetische Daten.

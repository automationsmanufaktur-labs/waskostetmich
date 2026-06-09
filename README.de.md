<div align="center">

<img src="https://raw.githubusercontent.com/automationsmanufaktur-labs/waskostetmich/main/assets/banner.svg" alt="WasKostetMich — finde jedes Abo in deinem Kontoauszug, 100 % im Browser" width="100%" />

<p>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/100%25-client--side-0d8a5f" alt="100% client-side" />
  <img src="https://img.shields.io/badge/backend-none-0d8a5f" alt="Kein Backend" />
  <img src="https://img.shields.io/badge/tests-84%20passing-0d8a5f" alt="84 Tests bestanden" />
</p>

[English](README.md) · **Deutsch**

</div>

> Lade deinen deutschen Kontoauszug (CSV) und entdecke **alle Abos und wiederkehrenden Abbuchungen** – inklusive der, die **schleichend teurer** geworden sind. Komplett im Browser. **Deine Bankdaten verlassen nie dein Gerät.**

---

## Warum?

Die meisten Menschen unterschätzen ihre Abo-Ausgaben massiv – und vergessen Verträge, die sie längst nicht mehr nutzen:

- **42 %** zahlen für ein Abo, das sie nicht mehr nutzen, weil sie die Abbuchung vergessen haben. Befragte schätzten ihre monatlichen Abo-Kosten auf **86 $**, tatsächlich waren es **219 $**. ([C+R Research, 2022, n=1.000](https://www.crresearch.com/blog/subscription-service-statistics-and-costs/))
- In Deutschland zahlen Streaming-Abonnent:innen im Schnitt **57 €/Monat** (684 €/Jahr) – **32 % haben den Überblick über ihre Abo-Kosten verloren.** ([Bango-Studie via heise, 2024](https://www.heise.de/en/news/Subscribers-in-Germany-pay-an-average-of-EUR-684-per-year-for-streaming-9759428.html))
- Anbieter erhöhen Preise gern leise. Das **Kammergericht Berlin** (Az. 23 U 15/22) erklärte die Netflix-Preisanpassungsklausel für unwirksam; der BGH machte das Urteil am 30.01.2025 rechtskräftig. Betroffene konnten Geld zurückfordern. ([vzbv](https://www.vzbv.de/urteile/preiserhoehungsklauseln-bei-netflix-und-spotify-sind-unwirksam))

WasKostetMich macht diese versteckten Kosten in 10 Sekunden sichtbar – **ohne** dass du irgendwo deine Bankzugangsdaten eingibst oder eine Datei hochlädst.

## Was es kann

- 📊 **Erkennt wiederkehrende Abbuchungen** und gruppiert sie pro Anbieter
- 📈 **Markiert schleichende Preiserhöhungen** („12,99 € → 13,99 € seit August – 12 € mehr pro Jahr")
- 🗓️ **Monatliche, jährliche, quartalsweise & wöchentliche** Zyklen
- 🧮 **Hochrechnung** auf Monats- und Jahreskosten + „X Abos = Y €/Monat"-Übersicht
- 🎯 **Wenig Fehlalarme**: Gehalt, Supermarkt-Einkäufe und Einmalkäufe werden herausgefiltert
- 🏦 **8 deutsche Bankformate** automatisch erkannt (siehe unten)
- 🔌 **Funktioniert offline** – lade die [Standalone-Datei](#offline--standalone) und öffne sie per Doppelklick

## 🔒 Privacy: nicht versprochen, sondern garantiert

Die Privacy-Story ist **architektonisch wahr**, nicht nur ein Marketing-Satz:

- Das Einlesen passiert ausschließlich über die Browser-`File`-API (`FileReader`/`arrayBuffer`).
- Es gibt **kein Backend**, keine Bank-API, keinen Upload, keine Anmeldung.
- Das gebaute JavaScript-Bundle enthält **kein einziges Netzwerk-Primitiv** – kein `fetch`, kein `XMLHttpRequest`, kein `WebSocket`, kein `sendBeacon`, keine externen URLs. Daten-Exfiltration ist damit technisch unmöglich.
- **Kein Analytics, keine Fonts/CDN von Dritten** – alle Assets sind lokal gebündelt.

**Nachprüfbar:** Öffne die DevTools (F12) → Tab „Netzwerk" → lade deinen Auszug. Du wirst **keinen einzigen Request** sehen. Oder ziehe das Internet ab – die App läuft weiter.

## Unterstützte Banken

| Bank | Format | Status |
|------|--------|--------|
| Sparkasse | CSV-CAMT | ✅ Kern |
| DKB | CSV (altes & neues Banking) | ✅ Kern |
| ING | CSV | ✅ Kern |
| Commerzbank | CSV | ✅ |
| Volksbank/Raiffeisenbank | CSV | ✅ |
| N26 | CSV | ✅ |
| comdirect | CSV | ✅ |
| Postbank | CSV | ✅ |

> ℹ️ Bei der Sparkasse heißt das richtige Format **„CSV-CAMT"** – das ist trotz des Namens eine CSV-Datei (kein camt.053-XML) und genau die, die du brauchst.

Deine Bank fehlt? → [Trag ein neues Format bei](docs/bank-format-beitragen.md) (meist <30 Zeilen).

## Schnellstart

```bash
git clone https://github.com/automationsmanufaktur-labs/waskostetmich.git
cd waskostetmich
npm install
npm run dev        # → http://localhost:5173
```

```bash
npm test           # 84 Unit-Tests (Parser + Detection)
npm run build      # statische Seite nach dist/
```

### Offline / Standalone

```bash
npm run build:standalone   # erzeugt dist-standalone/index.html (eine Datei, alles inline)
```

Die Datei `dist-standalone/index.html` kannst du speichern und per **Doppelklick offline** öffnen (`file://`) – ganz ohne Server und Internet. Perfekt, wenn du deinen Bankdaten wirklich nicht über den Weg traust.

## CLI & Analyse mit Claude Code

Neben der Web-App gibt es eine **Kommandozeilen-Analyse** – ideal für Skripte
oder die Auswertung mit Claude Code:

```bash
npm run analyze -- examples/beispiel-kontoauszug.csv            # lesbarer Report
npm run analyze -- pfad/zu/auszug.csv --json                    # strukturiertes JSON
npm run analyze -- pfad/zu/auszug.csv --json --redact           # Anbieter pseudonymisiert
```

Auch die CLI läuft **vollständig lokal** und sendet nichts.

### Mit Claude Code auswerten lassen

> ℹ️ **Privacy-Hinweis:** Wenn du Claude (oder ein anderes Cloud-LLM) die Analyse
> bewerten lässt, gelangt die **Abo-Zusammenfassung** (Anbieter + Beträge) in den
> LLM-Kontext – also an dessen Anbieter. Das ist ein bewusster, separater Schritt
> mit anderem Vertrauensmodell als die rein lokale Web-App. Wichtig: Claude bekommt
> **nie die Roh-CSV**, nur die erkannten Abos (kein Gehalt, keine Einzelkäufe, keine
> IBANs). Für maximale Diskretion `--redact` nutzen.

Im Repo liegt ein Claude-Code-Skill (`.claude/skills/kosten-analyse/`). Damit
kannst du in Claude Code einfach sagen:

> „Analysiere `~/Downloads/auszug.csv` und sag mir, welche Abos ich kündigen sollte."

Claude ruft dann die CLI auf (parst lokal), priorisiert nach Jahreskosten, erkennt
**Überlappungen** (z. B. zwei Streaming-Dienste), markiert Preiserhöhungen und
liefert eine Bewertung mit Sparpotenzial – ohne Rechtsberatung zu versprechen.

## Wie es funktioniert

```
Datei → Encoding-Erkennung → Format-Adapter → normalisiertes Transaktions-Modell → Detection-Engine → UI
```

**Parser** (`src/core/`)
- Heuristische **Encoding-Erkennung** (UTF-8-BOM, UTF-8, Windows-1252-Fallback) – deutsche Banken liefern meist Latin-1, das neue DKB-Banking UTF-8 mit BOM.
- **RFC-4180-konformer CSV-Parser** (verträgt Semikolons, Zeilenumbrüche und HTML im Verwendungszweck).
- **Header-basierte Bank-Erkennung** statt fester Zeilennummern – überlebt unterschiedliche Vorspann-Längen und Format-Updates.
- Extraktion der **SEPA-Gläubiger-ID & Mandatsreferenz** als stabiler Schlüssel.

**Detection-Engine** (`src/detect/`)
- Gruppierung primär über die Gläubiger-ID, sonst über normalisierte Anbieternamen mit **Token-Set-Ähnlichkeit** (Fuzzy-Match ≥ 0,85, robust gegen „PayPal *Netflix", Referenznummern usw.).
- Frequenz aus dem **Median der Tagesabstände** mit frequenzabhängigem Toleranzfenster.
- **Vertrauensstufen**: ab 2 Vorkommen „vermutet", ab 3 „bestätigt" (angelehnt an Plaid).
- **Preiserhöhung** = neues Niveau, das ≥ 2 Zyklen hält und Mindestschwellen (> 5 % UND > 0,50 €) überschreitet – konservativ, um Schwankungen (Strom/Mobilfunk) nicht fälschlich zu melden.

## Roadmap

- [ ] camt.053-XML-Import (echtes ISO-20022, z. B. aus StarMoney/MoneyMoney) – XPaths bereits recherchiert
- [ ] PDF-Kontoauszüge (client-side)
- [ ] Weitere Banken (Targobank, Consorsbank, …)
- [ ] Export der Ergebnisse (lokaler Download)
- [ ] Kündigungs-Hilfe-Links pro Anbieter

## Mitmachen

Beiträge willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md). Der häufigste Beitrag – ein **neues Bankformat** – ist in [docs/bank-format-beitragen.md](docs/bank-format-beitragen.md) Schritt für Schritt erklärt.

## ⚖️ Haftungsausschluss

WasKostetMich ist ein kostenloses **Informations-Werkzeug** und stellt **keine Rechts- oder Finanzberatung** dar. Die Erkennung erfolgt automatisch und schematisch; sie kann Fehler enthalten und ersetzt nicht die Prüfung deiner Verträge. Für eine rechtliche Einschätzung deiner individuellen Situation wende dich an eine Verbraucherzentrale oder einen Rechtsanwalt.

## Credits

Die deutschen Bank-CSV-Parser-Profile sind inspiriert von [taxhacker](https://github.com/vas3k/taxhacker) (MIT, © Vasily Zubarev).

## Lizenz

[MIT](LICENSE) – mach damit, was du willst.

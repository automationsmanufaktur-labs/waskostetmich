<div align="center">

<img src="https://raw.githubusercontent.com/automationsmanufaktur-labs/waskostetmich/main/assets/banner.svg" alt="WasKostetMich — find every subscription in your bank statement, 100% in your browser" width="100%" />

<p>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/100%25-client--side-0d8a5f" alt="100% client-side" />
  <img src="https://img.shields.io/badge/backend-none-0d8a5f" alt="No backend" />
  <img src="https://img.shields.io/badge/tests-84%20passing-0d8a5f" alt="84 tests passing" />
</p>

**English** · [Deutsch](README.de.md)

</div>

> Drop in your German bank statement (CSV) and see **every subscription and recurring charge** — including the ones that have **quietly grown more expensive**. Runs entirely in your browser. **Your bank data never leaves your device.**

---

## Why

Most people massively underestimate what they spend on subscriptions — and forget contracts they stopped using long ago:

- **42%** pay for a subscription they no longer use because they forgot the charge. Respondents *estimated* their monthly subscription cost at **$86**; it was actually **$219**. ([C+R Research, 2022, n=1,000](https://www.crresearch.com/blog/subscription-service-statistics-and-costs/))
- In Germany, streaming subscribers pay **€57/month** on average (€684/year) — and **32% have lost track of their subscription costs**. ([Bango study via heise, 2024](https://www.heise.de/en/news/Subscribers-in-Germany-pay-an-average-of-EUR-684-per-year-for-streaming-9759428.html))
- Providers like to raise prices quietly. The **Berlin Court of Appeal** (Az. 23 U 15/22) ruled Netflix's price-adjustment clause invalid; the German Federal Court of Justice made it final on 2025-01-30, and affected customers could reclaim money. ([vzbv](https://www.vzbv.de/urteile/preiserhoehungsklauseln-bei-netflix-und-spotify-sind-unwirksam))

WasKostetMich surfaces these hidden costs in 10 seconds — **without** ever asking for bank credentials or uploading a file.

## What it does

- 📊 **Detects recurring charges** and groups them per provider
- 📈 **Flags creeping price increases** ("€12.99 → €13.99 since August — €12 more per year")
- 🗓️ **Monthly, yearly, quarterly & weekly** cycles
- 🧮 **Projects** monthly and annual cost + an "X subscriptions = €Y/month" overview
- 🎯 **Few false positives**: salary, supermarket runs and one-off purchases are filtered out
- 🏦 **8 German bank formats** auto-detected (see below)
- 🔌 **Works offline** — download the [standalone file](#offline--standalone) and open it by double-click

## 🔒 Privacy: not promised, guaranteed by construction

The privacy story is **architecturally true**, not just a marketing line:

- Reading happens exclusively through the browser `File` API (`FileReader`/`arrayBuffer`).
- There is **no backend**, no bank API, no upload, no sign-in.
- The built JavaScript bundle contains **not a single network primitive** — no `fetch`, no `XMLHttpRequest`, no `WebSocket`, no `sendBeacon`, no external URLs. Data exfiltration is therefore *technically impossible*.
- **No analytics, no third-party fonts/CDN** — every asset is bundled locally.

**Verifiable:** open DevTools (F12) → "Network" tab → load your statement. You will see **zero requests**. Or pull the network plug — the app keeps working.

## Supported banks

| Bank | Format | Status |
|------|--------|--------|
| Sparkasse | CSV-CAMT | ✅ core |
| DKB | CSV (old & new banking) | ✅ core |
| ING | CSV | ✅ core |
| Commerzbank | CSV | ✅ |
| Volksbank/Raiffeisenbank | CSV | ✅ |
| N26 | CSV | ✅ |
| comdirect | CSV | ✅ |
| Postbank | CSV | ✅ |

> ℹ️ For Sparkasse the right export is called **"CSV-CAMT"** — despite the name it is a CSV file (not camt.053 XML), and exactly the one you need.

Bank missing? → [contribute a new format](docs/bank-format-beitragen.md) (usually <30 lines).

## Quick start

```bash
git clone https://github.com/automationsmanufaktur-labs/waskostetmich.git
cd waskostetmich
npm install
npm run dev        # → http://localhost:5173
```

```bash
npm test           # 84 unit tests (parser + detection)
npm run build      # static site to dist/
```

### Offline / standalone

```bash
npm run build:standalone   # produces dist-standalone/index.html (one file, everything inline)
```

Save `dist-standalone/index.html` and open it **offline by double-click** (`file://`) — no server, no internet. Perfect when you really don't trust your bank data anywhere.

## CLI & analysis with Claude Code

Besides the web app there's a **command-line analysis** — ideal for scripts or for evaluation with Claude Code:

```bash
npm run analyze -- examples/beispiel-kontoauszug.csv            # human-readable report
npm run analyze -- path/to/statement.csv --json                # structured JSON
npm run analyze -- path/to/statement.csv --json --redact        # providers pseudonymized
```

The CLI also runs **fully locally** and sends nothing.

> ℹ️ **Privacy note:** if you let Claude (or another cloud LLM) judge the result, the **subscription summary** (providers + amounts) enters the LLM context — i.e. goes to its provider. That's a deliberate, separate step with a different trust model than the purely local web app. Claude never receives the **raw CSV**, only the detected subscriptions (no salary, no individual purchases, no IBANs). For maximum discretion use `--redact`.

The repo ships a Claude Code skill (`.claude/skills/kosten-analyse/`). In Claude Code you can simply say:

> "Analyze `~/Downloads/statement.csv` and tell me which subscriptions I should cancel."

Claude then calls the CLI (parses locally), prioritizes by annual cost, detects **overlaps** (e.g. two streaming services), flags price increases and gives an assessment with savings potential — without promising legal advice.

## How it works

```
file → encoding detection → format adapter → normalized transaction model → detection engine → UI
```

**Parser** (`src/core/`)
- Heuristic **encoding detection** (UTF-8 BOM, UTF-8, Windows-1252 fallback) — German banks usually emit Latin-1; the new DKB banking emits UTF-8 with BOM.
- **RFC-4180-compliant CSV parser** (tolerant of semicolons, line breaks and HTML in the purpose field).
- **Header-based bank detection** instead of fixed line numbers — survives varying preamble lengths and format updates.
- Extracts the **SEPA creditor ID & mandate reference** as a stable key.

**Detection engine** (`src/detect/`)
- Groups primarily by creditor ID, otherwise by normalized provider names with **token-set similarity** (fuzzy match ≥ 0.85, robust against "PayPal *Netflix", reference numbers, etc.).
- Frequency from the **median of day gaps** with a frequency-dependent tolerance window.
- **Confidence tiers**: "suspected" from 2 occurrences, "confirmed" from 3 (modeled on Plaid).
- **Price increase** = a new level that holds for ≥ 2 cycles and crosses minimum thresholds (> 5% AND > €0.50) — conservative, so it doesn't falsely report fluctuations (electricity/mobile).

## Roadmap

- [ ] camt.053 XML import (real ISO-20022, e.g. from StarMoney/MoneyMoney) — XPaths already researched
- [ ] PDF bank statements (client-side)
- [ ] More banks (Targobank, Consorsbank, …)
- [ ] Export of results (local download)
- [ ] Cancellation-help links per provider

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md). The most common contribution — a **new bank format** — is explained step by step in [docs/bank-format-beitragen.md](docs/bank-format-beitragen.md).

## ⚖️ Disclaimer

WasKostetMich is a free **information tool** and does **not constitute legal or financial advice**. Detection is automatic and heuristic; it may contain errors and does not replace checking your contracts. For a legal assessment of your individual situation, contact a consumer advice center (Verbraucherzentrale) or a lawyer.

## Credits

The German bank CSV parser profiles are inspired by [taxhacker](https://github.com/vas3k/taxhacker) (MIT, © Vasily Zubarev).

## License

[MIT](LICENSE) — do whatever you want with it.

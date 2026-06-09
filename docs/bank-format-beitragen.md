# Ein neues Bankformat beitragen

Deine Bank wird noch nicht erkannt? Das hinzuzufügen dauert meist **15–30 Minuten**
und ist der wertvollste Beitrag zu diesem Projekt. Du brauchst keine tiefen
TypeScript-Kenntnisse.

## 1. CSV exportieren und anschauen

Exportiere im Online-Banking deiner Bank deine **Umsätze als CSV** (möglichst
12 Monate). Öffne die Datei in einem **Text-Editor** (nicht Excel!), damit du die
echten Spaltenüberschriften und Trennzeichen siehst.

Notiere dir:

- **Trennzeichen**: Semikolon `;` (meiste deutsche Banken) oder Komma `,` (N26)?
- **Vorspann**: Stehen vor der Tabellen-Überschrift Metazeilen (Konto, Zeitraum …)?
  (Macht nichts – wir erkennen die Header-Zeile automatisch.)
- **Spaltennamen** für: Buchungsdatum, Betrag, Empfänger/Auftraggeber, Verwendungszweck.
- **Datumsformat**: `31.12.2025`, `31.12.25` oder `2025-12-31`?
- **Betragsformat**: deutsch `-12,99` / `-1.234,56` oder englisch `-12.99`?
- Gibt es Spalten für **Gläubiger-ID** und **Mandatsreferenz**? (Super für die Erkennung.)

> ⚠️ **Anonymisiere die Datei**, bevor du sie irgendwo zeigst: ersetze IBANs, Namen
> und Beträge durch Beispielwerte. Echte Kontodaten gehören nie in das Repo oder ein Issue.

## 2. Profil hinzufügen

Öffne `src/core/bank-profiles.ts` und füge einen Eintrag zum Array `BANK_PROFILES`
hinzu. Beispiel (an deine Spaltennamen anpassen):

```ts
{
  id: 'meine-bank',
  name: 'Meine Bank',
  delimiter: ';',
  // 2–3 Spaltennamen, die diese Bank eindeutig identifizieren (kleingeschrieben):
  headerSignature: ['buchungstag', 'auftraggeber/empfänger', 'verwendungszweck'],
  dateStyle: 'de',        // 'de' = DD.MM.JJJJ / DD.MM.JJ, 'iso' = JJJJ-MM-TT
  decimalStyle: 'de',     // 'de' = 1.234,56 ; 'en' = 1,234.56
  amountStyle: 'signed',  // 'signed' = eine Spalte mit Vorzeichen; 'split' = Soll/Haben getrennt
  columns: {
    bookingDate: ['Buchungstag'],
    valueDate: ['Valuta'],
    amount: ['Betrag'],                       // bei 'signed'
    // debit: ['Soll'], credit: ['Haben'],    // bei 'split'
    counterparty: ['Auftraggeber/Empfänger'],
    purpose: ['Verwendungszweck'],
    bookingText: ['Buchungstext'],
    creditorId: ['Gläubiger-ID'],             // falls vorhanden
    mandateRef: ['Mandatsreferenz'],          // falls vorhanden
    counterpartyIban: ['IBAN'],
    currency: ['Währung'],
  },
}
```

**Tipps:**

- Pro Feld kannst du **mehrere Alias-Namen** angeben (z. B. `['Betrag (€)', 'Betrag (EUR)']`),
  falls die Bank Varianten liefert.
- Die `headerSignature` muss eindeutig sein, damit dein Format nicht mit einem anderen
  verwechselt wird. Wähle Spalten, die nur deine Bank so nennt.
- Du musst **kein** `skipRows` angeben – die Header-Zeile wird über die Spaltennamen gefunden.

## 3. Anonyme Fixture + Test

Lege eine kleine, **synthetische** Beispieldatei an: `tests/fixtures/meine-bank.csv`
(Header + 2–3 erfundene Buchungen, eine davon Netflix für `-12,99`).

Ergänze deine Bank in `tests/parse.test.ts` in der `CASES`-Liste:

```ts
{ file: 'meine-bank.csv', id: 'meine-bank', hasCreditorId: false },
```

Dann:

```bash
npm test
```

Wenn der Test grün ist, erkennt das Tool dein Format korrekt. 🎉

## 4. Pull Request

- Aktualisiere die Banken-Tabelle in der `README.md`.
- Bestätige im PR, dass die Fixture **keine echten Daten** enthält.
- Öffne den PR – danke! 💚

## Encoding-Probleme?

Falls Umlaute (ä/ö/ü) in deinem Export kaputt aussehen: Das übernimmt der
heuristische Decoder in `src/core/encoding.ts` automatisch (UTF-8-BOM / UTF-8 /
Windows-1252). Du musst dazu nichts konfigurieren. Sollte deine Bank ein exotisches
Encoding nutzen, öffne bitte ein Issue mit einer anonymisierten Beispielzeile.

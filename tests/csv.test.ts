import { describe, it, expect } from 'vitest'
import { parseCsv } from '../src/core/csv.ts'

describe('parseCsv', () => {
  it('parst einfache Zeilen', () => {
    expect(parseCsv('a;b;c\n1;2;3', ';')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('respektiert Delimiter innerhalb quotierter Felder', () => {
    const rows = parseCsv('"a";"b;c";"d"', ';')
    expect(rows[0]).toEqual(['a', 'b;c', 'd'])
  })

  it('verarbeitet Zeilenumbrüche innerhalb quotierter Felder', () => {
    const rows = parseCsv('"a";"zeile1\nzeile2";"c"', ';')
    expect(rows[0]).toEqual(['a', 'zeile1\nzeile2', 'c'])
  })

  it('behandelt verdoppelte Quotes als Escape', () => {
    const rows = parseCsv('"sag ""hallo""";"x"', ';')
    expect(rows[0]).toEqual(['sag "hallo"', 'x'])
  })

  it('verarbeitet CRLF-Zeilenenden', () => {
    expect(parseCsv('a;b\r\n1;2\r\n', ';')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('entfernt komplett leere Zeilen', () => {
    expect(parseCsv('a;b\n\n1;2\n\n', ';')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('unterstützt Komma als Delimiter (N26)', () => {
    expect(parseCsv('"a","b","c"', ',')).toEqual([['a', 'b', 'c']])
  })

  it('behandelt ein " mitten im unquotierten Feld als Literal (frisst keine Folgezeilen)', () => {
    const rows = parseCsv('a;Monitor 27" Kauf;100\n2026-01-02;Kaffee;5', ';')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual(['a', 'Monitor 27" Kauf', '100'])
    expect(rows[1]).toEqual(['2026-01-02', 'Kaffee', '5'])
  })
})

import { describe, expect, it } from 'vitest'
import { normalizeGrid, type RawRow } from '../src/table-grid'
import type { TableCellNode, TableRowNode } from '../src/types'

let cellCounter = 0
const cell = (colSpan = 1, rowSpan = 1, tag: 'td' | 'th' = 'td'): TableCellNode => ({
  type: 'table-cell',
  tag,
  isHeader: tag === 'th',
  colSpan,
  rowSpan,
  style: {},
  control: { display: 'table-cell', whiteSpace: 'normal' },
  attribs: {},
  children: [],
  key: `c${cellCounter++}`,
})

let rowCounter = 0
const row = (cells: TableCellNode[], isHeader = false, key = `r${rowCounter++}`): RawRow => ({
  isHeader,
  style: {},
  attribs: {},
  cells,
  key,
})

const weights = (r: TableRowNode): number[] =>
  r.items.map((it) => (it.type === 'table-cell' ? it.colSpan : 1))
const kinds = (r: TableRowNode): string[] => r.items.map((it) => it.type)

describe('normalizeGrid', () => {
  it('lays out a plain 2x2 grid', () => {
    const { rows, columnCount } = normalizeGrid([row([cell(), cell()]), row([cell(), cell()])])
    expect(columnCount).toBe(2)
    expect(rows.map(kinds)).toEqual([
      ['table-cell', 'table-cell'],
      ['table-cell', 'table-cell'],
    ])
  })

  it('widens a colspan cell and keeps the row weight sum equal to columnCount', () => {
    const { rows, columnCount } = normalizeGrid([
      row([cell(2), cell()]),
      row([cell(), cell(), cell()]),
    ])
    expect(columnCount).toBe(3)
    expect(weights(rows[0]!)).toEqual([2, 1])
    expect(weights(rows[0]!).reduce((a, b) => a + b, 0)).toBe(3)
    expect(weights(rows[1]!)).toEqual([1, 1, 1])
  })

  it('models a rowspan as a filler in the row below', () => {
    const { rows, columnCount } = normalizeGrid([row([cell(1, 2), cell()]), row([cell()])])
    expect(columnCount).toBe(2)
    expect(kinds(rows[0]!)).toEqual(['table-cell', 'table-cell'])
    expect(kinds(rows[1]!)).toEqual(['table-filler', 'table-cell'])
  })

  it('pads short rows with trailing fillers', () => {
    const { rows, columnCount } = normalizeGrid([row([cell(), cell(), cell()]), row([cell()])])
    expect(columnCount).toBe(3)
    expect(kinds(rows[1]!)).toEqual(['table-cell', 'table-filler', 'table-filler'])
  })

  it('combines colspan and rowspan footprints', () => {
    const { rows, columnCount } = normalizeGrid([row([cell(2, 2), cell()]), row([cell()])])
    expect(columnCount).toBe(3)
    expect(weights(rows[0]!)).toEqual([2, 1])
    expect(kinds(rows[1]!)).toEqual(['table-filler', 'table-filler', 'table-cell'])
  })

  it('gives fillers stable keys derived from the row key', () => {
    const { rows } = normalizeGrid([row([cell(1, 2)], false, 'r0'), row([], false, 'r1')])
    const filler = rows[1]!.items[0]!
    expect(filler.type).toBe('table-filler')
    expect(filler.key).toBe('r1:f0')
  })
})

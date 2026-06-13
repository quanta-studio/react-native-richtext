import { describe, expect, it } from 'vitest'
import { computeColumnWidths, type CellMeasure } from '../src/renderers/column-widths'

const m = (col: number, colSpan: number, width: number): CellMeasure => ({ col, colSpan, width })

describe('computeColumnWidths', () => {
  it('expands proportionally to fill when the table fits', () => {
    const r = computeColumnWidths({
      columnCount: 2,
      cells: [m(0, 1, 100), m(1, 1, 50)],
      explicit: [undefined, undefined],
      container: 300,
    })
    expect(r.overflow).toBe(false)
    expect(r.widths).toEqual([200, 100]) // slack 150 split 100:50
  })

  it('keeps natural widths and flags overflow when too wide', () => {
    const r = computeColumnWidths({
      columnCount: 2,
      cells: [m(0, 1, 200), m(1, 1, 200)],
      explicit: [undefined, undefined],
      container: 300,
    })
    expect(r).toEqual({ widths: [200, 200], overflow: true })
  })

  it('pins explicit columns and lets measured columns absorb slack', () => {
    const r = computeColumnWidths({
      columnCount: 2,
      cells: [m(1, 1, 100)],
      explicit: [80, undefined],
      container: 300,
    })
    expect(r.overflow).toBe(false)
    expect(r.widths).toEqual([80, 220]) // col0 pinned 80; col1 takes the rest
  })

  it('uses explicit widths as-is when all columns are explicit', () => {
    const r = computeColumnWidths({
      columnCount: 2,
      cells: [],
      explicit: [80, 120],
      container: 300,
    })
    expect(r).toEqual({ widths: [80, 120], overflow: false })
  })

  it('reconciles a colspan cell wider than its columns', () => {
    const r = computeColumnWidths({
      columnCount: 2,
      cells: [m(0, 1, 40), m(1, 1, 40), m(0, 2, 200)],
      explicit: [undefined, undefined],
      container: 1000,
    })
    // base max-content [40,40]=80; span cell 200 > 80 -> deficit 120 split -> [100,100]
    expect(r.widths).toEqual([500, 500]) // then expanded to fill 1000 proportionally (equal)
  })

  it('returns empty for zero columns', () => {
    expect(
      computeColumnWidths({ columnCount: 0, cells: [], explicit: [], container: 300 }),
    ).toEqual({
      widths: [],
      overflow: false,
    })
  })
})

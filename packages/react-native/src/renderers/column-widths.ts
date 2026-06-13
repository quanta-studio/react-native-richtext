export interface CellMeasure {
  col: number // 0-based start column
  colSpan: number
  width: number // measured natural (max-content) width
}

export interface ColumnWidthInput {
  columnCount: number
  cells: CellMeasure[] // measured origin cells (fillers excluded)
  explicit: (number | undefined)[] // per column; explicit px from <col>/cell, else undefined
  container: number // available width (> 0)
}

export interface ColumnWidthResult {
  widths: number[]
  overflow: boolean
}

/**
 * Content-proportional column widths from measured max-content + explicit widths.
 * Fits (Σ target ≤ container): expand non-explicit columns proportionally to fill.
 * Overflow: keep target widths, flag overflow (caller horizontally scrolls).
 */
export function computeColumnWidths(input: ColumnWidthInput): ColumnWidthResult {
  const { columnCount, cells, explicit, container } = input
  if (columnCount === 0) return { widths: [], overflow: false }

  // 1. per-column max-content from colSpan === 1 cells.
  const maxContent = new Array<number>(columnCount).fill(0)
  for (const c of cells) {
    if (c.colSpan === 1 && c.col >= 0 && c.col < columnCount && c.width > maxContent[c.col]!) {
      maxContent[c.col] = c.width
    }
  }
  // 2. colspan reconciliation: spanned columns must sum to at least the spanning cell.
  for (const c of cells) {
    if (c.colSpan <= 1) continue
    const end = Math.min(c.col + c.colSpan, columnCount)
    let sum = 0
    for (let i = c.col; i < end; i++) sum += maxContent[i]!
    if (c.width > sum) {
      const add = (c.width - sum) / (end - c.col)
      for (let i = c.col; i < end; i++) maxContent[i]! += add
    }
  }
  // 3. target width per column (explicit overrides measured).
  const target = maxContent.map((mc, i) => explicit[i] ?? mc)
  const total = target.reduce((a, b) => a + b, 0)

  // 4. distribute.
  if (total > container) {
    return { widths: target, overflow: true }
  }
  const slack = container - total
  const flexTotal = target.reduce((a, t, i) => (explicit[i] === undefined ? a + t : a), 0)
  const widths = target.map((t, i) => {
    if (explicit[i] !== undefined || flexTotal <= 0) return t
    return t + slack * (t / flexTotal)
  })
  return { widths, overflow: false }
}

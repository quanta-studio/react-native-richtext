import type { RNStyle, RowItem, TableCellNode, TableRowNode } from './types'

/** A table row before grid normalization: its origin cells in document order. */
export interface RawRow {
  isHeader: boolean
  style: RNStyle
  attribs: Record<string, string>
  cells: TableCellNode[]
  key: string
}

/**
 * Resolve colspan/rowspan into a fixed grid. Each output row's `items` cover every
 * column exactly once: an origin cell (weight = colSpan, which absorbs the columns it
 * spans) or a FillerSlot (weight 1) for a column covered by a rowspan from above or a
 * short row. Invariant: for every row, Σ weights === columnCount.
 */
export function normalizeGrid(rawRows: RawRow[]): { rows: TableRowNode[]; columnCount: number } {
  const occupied: Set<number>[] = []
  const ensure = (r: number): void => {
    while (occupied.length <= r) occupied.push(new Set<number>())
  }
  const placements: Map<number, TableCellNode>[] = rawRows.map(() => new Map())
  let columnCount = 0

  // Phase A — place each cell at the first free column, marking its colSpan×rowSpan footprint.
  rawRows.forEach((rawRow, r) => {
    ensure(r)
    let col = 0
    for (const cell of rawRow.cells) {
      while (occupied[r]!.has(col)) col++
      placements[r]!.set(col, cell)
      for (let dr = 0; dr < cell.rowSpan; dr++) {
        ensure(r + dr)
        for (let dc = 0; dc < cell.colSpan; dc++) occupied[r + dr]!.add(col + dc)
      }
      col += cell.colSpan
      if (col > columnCount) columnCount = col
    }
  })
  // Account for rowspans that extend the occupied width past any placed cell.
  for (const set of occupied) {
    for (const c of set) if (c + 1 > columnCount) columnCount = c + 1
  }

  // Phase B — linearize each row left-to-right into cells + fillers.
  const rows: TableRowNode[] = rawRows.map((rawRow, r) => {
    const items: RowItem[] = []
    for (let col = 0; col < columnCount; col++) {
      const cell = placements[r]!.get(col)
      if (cell) {
        items.push(cell)
        col += cell.colSpan - 1
      } else {
        items.push({ type: 'table-filler', key: `${rawRow.key}:f${col}` })
      }
    }
    return {
      type: 'table-row',
      isHeader: rawRow.isHeader,
      style: rawRow.style,
      attribs: rawRow.attribs,
      items,
      key: rawRow.key,
    }
  })

  return { rows, columnCount }
}

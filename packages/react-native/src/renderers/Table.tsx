import { useState } from 'react'
import { View, ScrollView } from 'react-native'
import { useRichTextContext } from '../context'
import { NodeRenderer } from '../NodeRenderer'
import { splitStyle } from '../style/split-style'
import { TableRow } from './TableRow'
import { TableCell } from './TableCell'
import { computeColumnWidths, type CellMeasure } from './column-widths'
import type { RendererProps } from '../types'
import type { TableCellNode, TableNode } from '@quanta-studio/react-native-richtext-core'

const BORDER_COLOR = '#000000'

function parseBorder(value: string | undefined): number {
  if (value === undefined) return 0
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function toPx(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : undefined
  if (typeof value === 'string') {
    const t = value.trim()
    if (t === '' || t.endsWith('%')) return undefined
    const n = Number.parseFloat(t)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  return undefined
}

function withStyle(cell: TableCellNode, extra: Record<string, unknown>): TableCellNode {
  return { ...cell, style: { ...cell.style, ...extra } }
}

// Per-column explicit width: <col> widths first, then colSpan-1 cell width.
function deriveExplicit(table: TableNode): (number | undefined)[] {
  const explicit = new Array<number | undefined>(table.columnCount).fill(undefined)
  if (table.colWidths) {
    for (let c = 0; c < table.columnCount; c++) explicit[c] = table.colWidths[c]
  }
  for (const row of table.rows) {
    let col = 0
    for (const item of row.items) {
      if (item.type === 'table-cell') {
        if (item.colSpan === 1 && explicit[col] === undefined) {
          explicit[col] = toPx(item.style.width) ?? toPx(item.attribs.width)
        }
        col += item.colSpan
      } else {
        col += 1
      }
    }
  }
  return explicit
}

function countCells(table: TableNode): number {
  let n = 0
  for (const row of table.rows) for (const item of row.items) if (item.type === 'table-cell') n++
  return n
}

export function Table({ node }: RendererProps) {
  const table = node as TableNode
  const { registry } = useRichTextContext()
  const { view } = splitStyle(table.style)
  const borderW = parseBorder(table.attribs.border)
  const tableBorder =
    borderW > 0
      ? { borderRightWidth: borderW, borderBottomWidth: borderW, borderColor: BORDER_COLOR }
      : null
  const RowComp = registry['tr'] ?? TableRow

  const explicit = deriveExplicit(table)
  const allExplicit = table.columnCount > 0 && explicit.every((w): w is number => w !== undefined)
  const expected = countCells(table)

  const [container, setContainer] = useState<number | undefined>(undefined)
  const [measures, setMeasures] = useState<Map<string, CellMeasure>>(() => new Map())

  // Final widths: explicit-only path needs no measurement; otherwise wait for container + cells.
  let widths: number[] | undefined
  let overflow = false
  if (allExplicit) {
    widths = explicit as number[]
    overflow = container !== undefined && widths.reduce((a, b) => a + b, 0) > container
  } else if (container !== undefined && measures.size >= expected) {
    const r = computeColumnWidths({
      columnCount: table.columnCount,
      cells: [...measures.values()],
      explicit,
      container,
    })
    widths = r.widths
    overflow = r.overflow
  }

  const recordCell = (key: string, mse: CellMeasure): void => {
    setMeasures((prev) => {
      const existing = prev.get(key)
      if (existing && existing.width === mse.width) return prev
      const next = new Map(prev)
      next.set(key, mse)
      return next
    })
  }
  const onOuterLayout = (w: number): void => {
    if (w > 0 && w !== container) setContainer(w)
  }

  const renderCells = (items: TableNode['rows'][number]['items']) => {
    let col = 0
    return items.map((item) => {
      const at = col
      if (item.type === 'table-filler') {
        col += 1
        return <View key={item.key} style={{ width: widths ? (widths[at] ?? 0) : 0 }} />
      }
      const span = item.colSpan
      col += span
      const CellComp = registry[item.tag] ?? TableCell
      const bordered =
        borderW > 0
          ? withStyle(item, {
              borderTopWidth: borderW,
              borderLeftWidth: borderW,
              borderColor: item.style.borderColor ?? BORDER_COLOR,
            })
          : item
      const content = item.children.map((c) => <NodeRenderer key={c.key} node={c} />)

      if (widths) {
        let w = 0
        for (let i = at; i < at + span; i++) w += widths[i] ?? 0
        return (
          <CellComp key={item.key} node={withStyle(bordered, { width: w, flexShrink: 0 })}>
            {content}
          </CellComp>
        )
      }
      // measure pass: a thin wrapper reports the cell's natural width.
      return (
        <View
          key={item.key}
          style={{ flexShrink: 0 }}
          onLayout={(e) =>
            recordCell(item.key, { col: at, colSpan: span, width: e.nativeEvent.layout.width })
          }
        >
          <CellComp node={bordered}>{content}</CellComp>
        </View>
      )
    })
  }

  const rows = (
    <View style={tableBorder}>
      {table.rows.map((row) => (
        <RowComp key={row.key} node={row}>
          {renderCells(row.items)}
        </RowComp>
      ))}
    </View>
  )

  return (
    <View style={view} onLayout={(e) => onOuterLayout(e.nativeEvent.layout.width)}>
      {table.caption?.map((c) => (
        <NodeRenderer key={c.key} node={c} />
      ))}
      {overflow ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {rows}
        </ScrollView>
      ) : (
        rows
      )}
    </View>
  )
}

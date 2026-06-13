import { View } from 'react-native'
import { useRichTextContext } from '../context'
import { NodeRenderer } from '../NodeRenderer'
import { splitStyle } from '../style/split-style'
import { TableRow } from './TableRow'
import { TableCell } from './TableCell'
import type { RendererProps } from '../types'
import type { TableCellNode, TableNode } from '@yk-yong/react-native-richtext-core'

const BORDER_COLOR = '#000000'

function parseBorder(value: string | undefined): number {
  if (value === undefined) return 0
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Collapse approximation: top+left on each cell, bottom+right on the table box. */
function cellWithBorder(cell: TableCellNode, borderW: number): TableCellNode {
  if (borderW <= 0) return cell
  return {
    ...cell,
    style: {
      ...cell.style,
      borderTopWidth: borderW,
      borderLeftWidth: borderW,
      borderColor: cell.style.borderColor ?? BORDER_COLOR,
    },
  }
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

  return (
    <View style={view}>
      {table.caption?.map((c) => (
        <NodeRenderer key={c.key} node={c} />
      ))}
      <View style={tableBorder}>
        {table.rows.map((row) => (
          <RowComp key={row.key} node={row}>
            {row.items.map((item) => {
              if (item.type === 'table-filler') {
                return <View key={item.key} style={{ flexGrow: 1, flexBasis: 0 }} />
              }
              const CellComp = registry[item.tag] ?? TableCell
              return (
                <CellComp key={item.key} node={cellWithBorder(item, borderW)}>
                  {item.children.map((c) => (
                    <NodeRenderer key={c.key} node={c} />
                  ))}
                </CellComp>
              )
            })}
          </RowComp>
        ))}
      </View>
    </View>
  )
}

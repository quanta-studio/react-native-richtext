import { View } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { TableCellNode } from '@yk-yong/react-native-richtext-core'

// 4b: the Table owns column width (set on the node's style); the cell just renders its box.
export function TableCell({ node, children }: RendererProps) {
  const cell = node as TableCellNode
  const { view } = splitStyle(cell.style)
  return <View style={view}>{children}</View>
}

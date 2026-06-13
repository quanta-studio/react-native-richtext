import { View } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { TableRowNode } from '@yk-yong/react-native-richtext-core'

export function TableRow({ node, children }: RendererProps) {
  const row = node as TableRowNode
  const { view } = splitStyle(row.style)
  return <View style={[view, { flexDirection: 'row', alignItems: 'stretch' }]}>{children}</View>
}

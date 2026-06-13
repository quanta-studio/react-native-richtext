import { View, Text } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@yk-yong/rn-rich-text-core'

export function ListItem({ node, children }: RendererProps) {
  const el = node as BlockNode
  const { view } = splitStyle(el.style)
  const marker = el.marker?.text ?? ''
  return (
    <View style={[view, { flexDirection: 'row' }]}>
      <Text>{marker ? `${marker} ` : ''}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}

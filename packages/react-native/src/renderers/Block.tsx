import { View } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@yk-yong/react-native-richtext-core'

export function Block({ node, children }: RendererProps) {
  const { view } = splitStyle((node as BlockNode).style)
  return <View style={view}>{children}</View>
}

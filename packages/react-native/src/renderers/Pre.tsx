import { View, ScrollView } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@yk-yong/rn-rich-text-core'

export function Pre({ node, children }: RendererProps) {
  const { view } = splitStyle((node as BlockNode).style)
  return (
    <View style={view}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  )
}

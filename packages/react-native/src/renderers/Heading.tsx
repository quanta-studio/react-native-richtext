import { View } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@yk-yong/react-native-richtext-core'

// h1–h6: a block View carrying the screen-reader "header" trait. `accessible` groups the
// heading as one announced element (required for the trait to surface and for heading
// navigation). RN 0.86 has no typed heading-level prop, so level is not emitted.
export function Heading({ node, children }: RendererProps) {
  const el = node as BlockNode
  const { view } = splitStyle(el.style)
  return (
    <View style={view} accessible accessibilityRole="header">
      {children}
    </View>
  )
}

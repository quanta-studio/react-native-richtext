import { Text } from 'react-native'
import { splitStyle } from '../style/split-style'
import { resolveFont } from '../fonts/resolve-font'
import { useRichTextContext } from '../context'
import type { RendererProps } from '../types'
import type { InlineNode } from '@yk-yong/react-native-richtext-core'

export function Anchor({ node, children }: RendererProps) {
  const { fonts, onLinkPress } = useRichTextContext()
  const el = node as InlineNode
  const { text } = splitStyle(el.style)
  const href = el.attribs.href
  return (
    <Text
      style={resolveFont(text, fonts)}
      onPress={href ? () => onLinkPress(href) : undefined}
      accessibilityRole={href ? 'link' : undefined}
    >
      {children}
    </Text>
  )
}

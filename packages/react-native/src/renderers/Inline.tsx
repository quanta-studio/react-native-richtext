import { Text } from 'react-native'
import { splitStyle } from '../style/split-style'
import { resolveFont } from '../fonts/resolve-font'
import { useRichTextContext } from '../context'
import type { RendererProps } from '../types'
import type { InlineNode } from '@yk-yong/react-native-richtext-core'

export function Inline({ node, children }: RendererProps) {
  const { fonts } = useRichTextContext()
  const { text } = splitStyle((node as InlineNode).style)
  return <Text style={resolveFont(text, fonts)}>{children}</Text>
}

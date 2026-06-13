import { useMemo } from 'react'
import { View, Linking } from 'react-native'
import { parse } from '@yk-yong/react-native-richtext-dom'
import { resolveStyles } from '@yk-yong/react-native-richtext-css'
import { buildRenderTree } from '@yk-yong/react-native-richtext-core'
import { RichTextContext } from './context'
import { NodeRenderer } from './NodeRenderer'
import { defaultRenderers } from './renderers/defaults'
import type { RichTextProps } from './types'

export function RichText(props: RichTextProps) {
  const { source, baseStyle, tagStyles, classStyles, renderers, fonts, onLinkPress, style } = props

  const tree = useMemo(() => {
    const doc = parse(source.html)
    const { styles } = resolveStyles(doc, { baseStyle, tagStyles, classStyles })
    return buildRenderTree(doc, styles)
  }, [source.html, baseStyle, tagStyles, classStyles])

  const registry = useMemo(() => ({ ...defaultRenderers, ...renderers }), [renderers])

  const value = useMemo(
    () => ({
      registry,
      fonts,
      onLinkPress: onLinkPress ?? ((href: string) => void Linking.openURL(href)),
    }),
    [registry, fonts, onLinkPress],
  )

  return (
    <RichTextContext.Provider value={value}>
      <View style={style}>
        {tree.map((node) => (
          <NodeRenderer key={node.key} node={node} />
        ))}
      </View>
    </RichTextContext.Provider>
  )
}

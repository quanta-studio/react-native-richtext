import { Fragment } from 'react'
import { useRichTextContext } from './context'
import { Block } from './renderers/Block'
import { InlineContainer } from './renderers/InlineContainer'
import { Inline } from './renderers/Inline'
import type { RenderNode } from '@yk-yong/rn-rich-text-core'

export function NodeRenderer({ node }: { node: RenderNode }) {
  const { registry } = useRichTextContext()

  switch (node.type) {
    case 'text':
      return <Fragment>{node.text}</Fragment>
    case 'linebreak':
      return <Fragment>{'\n'}</Fragment>
    case 'inline-container':
      return (
        <InlineContainer node={node}>
          {node.children.map((c) => (
            <NodeRenderer key={c.key} node={c} />
          ))}
        </InlineContainer>
      )
    case 'inline': {
      const Comp = registry[node.tag] ?? Inline
      return (
        <Comp node={node}>
          {node.children.map((c) => (
            <NodeRenderer key={c.key} node={c} />
          ))}
        </Comp>
      )
    }
    case 'block': {
      const Comp = registry[node.tag] ?? Block
      return (
        <Comp node={node}>
          {node.children.map((c) => (
            <NodeRenderer key={c.key} node={c} />
          ))}
        </Comp>
      )
    }
    default:
      return null
  }
}

import { Fragment } from 'react'
import { useRichTextContext } from './context'
import { Block } from './renderers/Block'
import { InlineContainer } from './renderers/InlineContainer'
import { Inline } from './renderers/Inline'
import { Table } from './renderers/Table'
import type { RenderNode } from '@quanta-studio/react-native-richtext-core'

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
    case 'table': {
      const Comp = registry['table'] ?? Table
      return <Comp node={node} />
    }
    default:
      // table-row / table-cell / table-filler are rendered internally by Table.tsx,
      // never dispatched here directly.
      return null
  }
}

import { describe, expect, it } from 'vitest'
import type {
  RenderNode,
  BlockNode,
  InlineContainerNode,
  InlineNode,
  TextNode,
  LineBreakNode,
  ListMarker,
} from '../src/types'

describe('types', () => {
  it('constructs the node variants', () => {
    const text: TextNode = { type: 'text', text: 'hi', key: '0' }
    const br: LineBreakNode = { type: 'linebreak', key: '1' }
    const inline: InlineNode = {
      type: 'inline',
      tag: 'b',
      style: { fontWeight: 'bold' },
      control: { display: 'inline', whiteSpace: 'normal' },
      attribs: {},
      children: [text],
      key: '0.0',
    }
    const container: InlineContainerNode = {
      type: 'inline-container',
      style: {},
      whiteSpace: 'normal',
      children: [inline, br],
      key: '0',
    }
    const marker: ListMarker = { ordered: false, index: 1, listStyleType: 'disc', text: '•' }
    const block: BlockNode = {
      type: 'block',
      tag: 'li',
      style: {},
      control: { display: 'list-item', whiteSpace: 'normal' },
      attribs: {},
      marker,
      children: [container],
      key: '0',
    }
    const nodes: RenderNode[] = [block, container, inline, text, br]
    expect(nodes.map((n) => n.type)).toEqual(['block', 'inline-container', 'inline', 'text', 'linebreak'])
  })
})

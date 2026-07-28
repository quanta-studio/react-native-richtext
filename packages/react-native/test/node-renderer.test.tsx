import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { NodeRenderer } from '../src/NodeRenderer'
import { RichTextContext } from '../src/context'
import type { BlockNode } from '@quanta-studio/react-native-richtext-core'

const ctx = { registry: {}, fonts: undefined, onLinkPress: () => {} }
const wrap = (ui: React.ReactNode) =>
  create(<RichTextContext.Provider value={ctx}>{ui}</RichTextContext.Provider>)

const tree: BlockNode = {
  type: 'block',
  tag: 'p',
  style: {},
  control: { display: 'block', whiteSpace: 'normal' },
  attribs: {},
  key: '0',
  children: [
    {
      type: 'inline-container',
      style: {},
      whiteSpace: 'normal',
      key: '0.0',
      children: [
        { type: 'text', text: 'hi ', key: '0.0.0' },
        {
          type: 'inline',
          tag: 'b',
          style: { fontWeight: 'bold' },
          control: { display: 'inline', whiteSpace: 'normal' },
          attribs: {},
          key: '0.0.1',
          children: [{ type: 'text', text: 'bold', key: '0.0.1.0' }],
        },
      ],
    },
  ],
}

describe('NodeRenderer', () => {
  it('renders a block as a View containing a Text with the inline content', () => {
    const r = wrap(<NodeRenderer node={tree} />)
    expect(r.root.findAllByType(View)).toHaveLength(1)
    const texts = r.root.findAllByType(Text)
    expect(texts.length).toBe(2)
    expect(r.toJSON()).toBeTruthy()
  })

  it('renders text and linebreak leaves', () => {
    const r = wrap(
      <NodeRenderer
        node={{
          type: 'inline-container',
          style: {},
          whiteSpace: 'normal',
          key: '0',
          children: [
            { type: 'text', text: 'a', key: '0.0' },
            { type: 'linebreak', key: '0.1' },
            { type: 'text', text: 'b', key: '0.2' },
          ],
        }}
      />,
    )
    const text = r.root.findAllByType(Text)[0]!
    expect(JSON.stringify(r.toJSON())).toContain('\\n')
    expect(text).toBeTruthy()
  })
})

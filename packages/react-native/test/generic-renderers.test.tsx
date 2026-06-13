import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { Block } from '../src/renderers/Block'
import { InlineContainer } from '../src/renderers/InlineContainer'
import { Inline } from '../src/renderers/Inline'
import { RichTextContext } from '../src/context'
import type { BlockNode, InlineContainerNode, InlineNode } from '@yk-yong/rn-rich-text-core'

const ctx = { registry: {}, fonts: { Mont: { '700': { normal: 'Mont-Bold' } } }, onLinkPress: () => {} }
const wrap = (ui: React.ReactNode) =>
  create(<RichTextContext.Provider value={ctx}>{ui}</RichTextContext.Provider>)

describe('generic renderers', () => {
  it('Block renders a View with box style only', () => {
    const node: BlockNode = {
      type: 'block', tag: 'div', style: { marginTop: 10, color: 'red' },
      control: { display: 'block', whiteSpace: 'normal' }, attribs: {}, children: [], key: '0',
    }
    const tree = wrap(<Block node={node}><Text>x</Text></Block>)
    const view = tree.root.findByType(View)
    expect(view.props.style).toEqual({ marginTop: 10 })
  })

  it('InlineContainer renders a Text with text style', () => {
    const node: InlineContainerNode = {
      type: 'inline-container', style: { color: 'red', marginTop: 10 }, whiteSpace: 'normal', children: [], key: '0',
    }
    const tree = wrap(<InlineContainer node={node}>hi</InlineContainer>)
    const text = tree.root.findByType(Text)
    expect(text.props.style).toEqual({ color: 'red' })
  })

  it('Inline font-resolves bold to a concrete face', () => {
    const node: InlineNode = {
      type: 'inline', tag: 'b', style: { fontFamily: 'Mont', fontWeight: 'bold' },
      control: { display: 'inline', whiteSpace: 'normal' }, attribs: {}, children: [], key: '0',
    }
    const tree = wrap(<Inline node={node}>x</Inline>)
    expect(tree.root.findByType(Text).props.style).toEqual({ fontFamily: 'Mont-Bold' })
  })
})

import { describe, expect, it, vi } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { Anchor } from '../src/renderers/Anchor'
import { ListItem } from '../src/renderers/ListItem'
import { Rule } from '../src/renderers/Rule'
import { defaultRenderers } from '../src/renderers/defaults'
import { RichTextContext } from '../src/context'
import type { BlockNode, InlineNode } from '@yk-yong/react-native-richtext-core'

const makeCtx = (onLinkPress = () => {}) => ({ registry: {}, fonts: undefined, onLinkPress })
const wrap = (ui: React.ReactNode, ctx = makeCtx()) =>
  create(<RichTextContext.Provider value={ctx}>{ui}</RichTextContext.Provider>)

describe('specializations', () => {
  it('Anchor calls onLinkPress(href) on press', () => {
    const onLinkPress = vi.fn()
    const node: InlineNode = {
      type: 'inline',
      tag: 'a',
      style: {},
      control: { display: 'inline', whiteSpace: 'normal' },
      attribs: { href: 'https://x.com' },
      children: [],
      key: '0',
    }
    const tree = wrap(<Anchor node={node}>link</Anchor>, makeCtx(onLinkPress))
    tree.root.findByType(Text).props.onPress()
    expect(onLinkPress).toHaveBeenCalledWith('https://x.com')
  })

  it('ListItem renders the marker text and content', () => {
    const node: BlockNode = {
      type: 'block',
      tag: 'li',
      style: {},
      control: { display: 'list-item', whiteSpace: 'normal' },
      attribs: {},
      key: '0',
      marker: { ordered: false, index: 1, listStyleType: 'disc', text: '•' },
      children: [],
    }
    const tree = wrap(
      <ListItem node={node}>
        <Text>item</Text>
      </ListItem>,
    )
    const markerText = tree.root
      .findAllByType(Text)
      .map((t) => t.props.children)
      .flat()
    expect(JSON.stringify(markerText)).toContain('•')
  })

  it('Rule renders a View', () => {
    const node: BlockNode = {
      type: 'block',
      tag: 'hr',
      style: { borderBottomWidth: 1 },
      control: { display: 'block', whiteSpace: 'normal' },
      attribs: {},
      key: '0',
      children: [],
    }
    const tree = wrap(<Rule node={node} />)
    expect(tree.root.findByType(View).props.style).toMatchObject({ borderBottomWidth: 1 })
  })

  it('defaultRenderers maps the specializations', () => {
    expect(defaultRenderers.a).toBe(Anchor)
    expect(defaultRenderers.li).toBe(ListItem)
    expect(defaultRenderers.hr).toBe(Rule)
  })

  it('marks an anchor with href as a link for screen readers', () => {
    const node: InlineNode = {
      type: 'inline', tag: 'a', style: {},
      control: { display: 'inline', whiteSpace: 'normal' },
      attribs: { href: 'https://x.com' }, children: [], key: '0',
    }
    const tree = wrap(<Anchor node={node}>link</Anchor>)
    expect(tree.root.findByType(Text).props.accessibilityRole).toBe('link')
  })

  it('sets no link role on an anchor without href', () => {
    const node: InlineNode = {
      type: 'inline', tag: 'a', style: {},
      control: { display: 'inline', whiteSpace: 'normal' },
      attribs: {}, children: [], key: '0',
    }
    const tree = wrap(<Anchor node={node}>x</Anchor>)
    expect(tree.root.findByType(Text).props.accessibilityRole).toBeUndefined()
  })
})

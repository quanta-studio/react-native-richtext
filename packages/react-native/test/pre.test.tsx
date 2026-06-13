import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, ScrollView, Text } from 'react-native'
import { Pre } from '../src/renderers/Pre'
import { defaultRenderers } from '../src/renderers/defaults'
import type { BlockNode } from '@yk-yong/react-native-richtext-core'

const preNode = (style: Record<string, unknown> = {}): BlockNode => ({
  type: 'block',
  tag: 'pre',
  style,
  control: { display: 'block', whiteSpace: 'pre' },
  attribs: {},
  children: [],
  key: '0',
})

describe('Pre', () => {
  it('wraps content in a horizontal ScrollView inside a View with the box style', () => {
    const tree = create(
      <Pre node={preNode({ marginTop: 8 })}>
        <Text>code</Text>
      </Pre>,
    )
    expect(tree.root.findAllByType(View)[0]!.props.style).toMatchObject({ marginTop: 8 })
    const scroll = tree.root.findAllByType(ScrollView)[0]!
    expect(scroll.props.horizontal).toBe(true)
  })

  it('is registered as the pre default renderer', () => {
    expect(defaultRenderers.pre).toBe(Pre)
  })
})

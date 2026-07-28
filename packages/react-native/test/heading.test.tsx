import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View } from 'react-native'
import { Heading } from '../src/renderers/Heading'
import { defaultRenderers } from '../src/renderers/defaults'
import type { BlockNode } from '@quanta-studio/react-native-richtext-core'

const headingNode = (tag: string, style: Record<string, unknown> = {}): BlockNode => ({
  type: 'block',
  tag,
  style,
  control: { display: 'block', whiteSpace: 'normal' },
  attribs: {},
  children: [],
  key: '0',
})

describe('Heading', () => {
  it('renders a View with the header role and is accessible', () => {
    const tree = create(<Heading node={headingNode('h2', { marginTop: 8 })} />)
    const view = tree.root.findByType(View)
    expect(view.props.accessibilityRole).toBe('header')
    expect(view.props.accessible).toBe(true)
    expect(view.props.style).toMatchObject({ marginTop: 8 })
  })

  it('is registered as the renderer for h1 through h6', () => {
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      expect(defaultRenderers[tag]).toBe(Heading)
    }
  })
})

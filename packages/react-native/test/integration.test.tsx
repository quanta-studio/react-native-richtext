import { describe, expect, it, vi } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { RichText } from '../src'
import type { FontMap } from '../src'

const html =
  '<article><h1>Title</h1><p>Intro with <strong>bold</strong> and <em>italic</em>, ' +
  'plus a <a href="https://example.com">link</a>.</p><ul><li>one</li><li>two</li></ul></article>'

const fonts: FontMap = {
  System: { '700': { normal: 'System-Bold' }, '400': { normal: 'System-Regular' } },
}

describe('integration: RichText', () => {
  it('renders the document structure with Views and Texts', () => {
    const tree = create(<RichText source={{ html }} />)
    expect(tree.root.findAllByType(View).length).toBeGreaterThan(0)
    const json = JSON.stringify(tree.toJSON())
    expect(json).toContain('Title')
    expect(json).toContain('bold')
    expect(json).toContain('•')
  })

  it('resolves a registered bold face for <strong>', () => {
    const tree = create(
      <RichText
        source={{ html: '<p style="font-family: System"><strong>x</strong></p>' }}
        fonts={fonts}
      />,
    )
    const boldFace = tree.root.findAllByType(Text).some((t) => {
      const s = t.props.style as Record<string, unknown> | undefined
      return s?.fontFamily === 'System-Bold'
    })
    expect(boldFace).toBe(true)
  })

  it('fires onLinkPress from the rendered anchor', () => {
    const onLinkPress = vi.fn()
    const tree = create(<RichText source={{ html }} onLinkPress={onLinkPress} />)
    const anchor = tree.root.findAllByType(Text).find((t) => typeof t.props.onPress === 'function')!
    anchor.props.onPress()
    expect(onLinkPress).toHaveBeenCalledWith('https://example.com')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { RichText } from '../src'

describe('RichText', () => {
  it('renders a paragraph as a View > Text with the collapsed text', () => {
    const tree = create(<RichText source={{ html: '<p>hello   world</p>' }} />)
    const texts = tree.root.findAllByType(Text)
    const flat = JSON.stringify(tree.toJSON())
    expect(flat).toContain('hello world')
    expect(texts.length).toBeGreaterThan(0)
    expect(tree.root.findAllByType(View).length).toBeGreaterThan(0)
  })

  it('applies tagStyles through the cascade', () => {
    const tree = create(
      <RichText source={{ html: '<p>x</p>' }} tagStyles={{ p: { color: 'tomato' } }} />,
    )
    const colored = tree.root.findAllByType(Text).some((t) => {
      const s = t.props.style as Record<string, unknown> | undefined
      return s?.color === 'tomato'
    })
    expect(colored).toBe(true)
  })

  it('wires onLinkPress for anchors', () => {
    const onLinkPress = vi.fn()
    const tree = create(
      <RichText source={{ html: '<p><a href="https://x.com">link</a></p>' }} onLinkPress={onLinkPress} />,
    )
    const anchor = tree.root.findAllByType(Text).find((t) => typeof t.props.onPress === 'function')!
    anchor.props.onPress()
    expect(onLinkPress).toHaveBeenCalledWith('https://x.com')
  })

  it('lets a custom renderer override a tag', () => {
    const Custom = () => <View testID="custom" />
    const tree = create(
      <RichText source={{ html: '<p>x</p>' }} renderers={{ p: Custom }} />,
    )
    expect(tree.root.findAll((n) => n.props.testID === 'custom').length).toBe(1)
  })
})

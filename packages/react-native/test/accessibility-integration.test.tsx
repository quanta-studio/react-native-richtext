import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { RichText } from '../src'

describe('integration: accessibility', () => {
  const html = '<h2>Title</h2><p><a href="https://x.com">link</a></p>'

  it('exposes header and link roles through RichText', () => {
    const tree = create(<RichText source={{ html }} />)
    const hasHeader = tree.root
      .findAllByType(View)
      .some((v) => v.props.accessibilityRole === 'header')
    const hasLink = tree.root.findAllByType(Text).some((t) => t.props.accessibilityRole === 'link')
    expect(hasHeader).toBe(true)
    expect(hasLink).toBe(true)
  })
})

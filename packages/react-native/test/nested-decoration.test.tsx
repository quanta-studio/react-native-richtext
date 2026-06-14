import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { Text } from 'react-native'
import { RichText } from '../src'

describe('integration: nested text decoration', () => {
  // <u> nested inside <strike> must keep BOTH lines on the inner text.
  const html =
    '<span>Testing</span> <i>Summary</i> <u>Underline </u>' +
    '<strike>Strikethrough <u><i><b>Descriptions</b></i></u></strike>'

  it('combines underline + line-through on deeply nested text', () => {
    const tree = create(<RichText source={{ html }} />)
    const combined = tree.root
      .findAllByType(Text)
      .some(
        (t) =>
          (t.props.style as Record<string, unknown> | undefined)?.textDecorationLine ===
          'underline line-through',
      )
    expect(combined).toBe(true)
    expect(JSON.stringify(tree.toJSON())).toContain('Descriptions')
  })

  it('still renders a single decoration for a standalone element', () => {
    const tree = create(<RichText source={{ html: '<u>x</u>' }} />)
    const underlineOnly = tree.root
      .findAllByType(Text)
      .some(
        (t) =>
          (t.props.style as Record<string, unknown> | undefined)?.textDecorationLine ===
          'underline',
      )
    expect(underlineOnly).toBe(true)
  })
})

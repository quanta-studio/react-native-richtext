import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, ScrollView } from 'react-native'
import { RichText } from '../src'

describe('integration: list/quote/pre polish', () => {
  it('renders ol type + start + value markers', () => {
    const tree = create(
      <RichText source={{ html: '<ol type="a" start="3"><li>x</li><li value="9">y</li></ol>' }} />,
    )
    const json = JSON.stringify(tree.toJSON())
    expect(json).toContain('c. ') // index 3 with type=a -> 'c.'
    expect(json).toContain('i. ') // li value=9 with type=a -> 'i.' (9th letter)
  })

  it('renders pre inside a ScrollView', () => {
    const tree = create(<RichText source={{ html: '<pre>  line1\n  line2</pre>' }} />)
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(1)
  })

  it('gives blockquote a left border', () => {
    const tree = create(<RichText source={{ html: '<blockquote>quote</blockquote>' }} />)
    const hasBorder = tree.root.findAllByType(View).some((v) => {
      const s = v.props.style as Record<string, unknown> | undefined
      return s?.borderLeftWidth === 4
    })
    expect(hasBorder).toBe(true)
  })
})

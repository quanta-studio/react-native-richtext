import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { RichText } from '../src'

const html =
  '<table border="1">' +
  '<thead><tr><th>Name</th><th colspan="2">Score</th></tr></thead>' +
  '<tbody><tr><td>Ann</td><td>1</td><td>2</td></tr></tbody>' +
  '</table>'

describe('integration: tables', () => {
  it('renders header and body cell text', () => {
    const tree = create(<RichText source={{ html }} />)
    const json = JSON.stringify(tree.toJSON())
    expect(json).toContain('Name')
    expect(json).toContain('Score')
    expect(json).toContain('Ann')
  })

  it('renders the colspan header cell across the table without crashing', () => {
    const tree = create(<RichText source={{ html }} />)
    expect(JSON.stringify(tree.toJSON())).toContain('Score')
  })

  it('centers header text via inherited th styling', () => {
    const tree = create(<RichText source={{ html }} />)
    const centeredHeader = tree.root.findAllByType(Text).some((t) => {
      const s = t.props.style as Record<string, unknown> | undefined
      return s?.textAlign === 'center'
    })
    expect(centeredHeader).toBe(true)
  })
})

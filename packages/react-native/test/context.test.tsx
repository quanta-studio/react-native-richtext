import { describe, expect, it } from 'vitest'
import { create, type ReactTestRendererJSON } from 'react-test-renderer'
import { Text } from 'react-native'
import { RichTextContext, useRichTextContext } from '../src/context'

function Probe() {
  const { onLinkPress } = useRichTextContext()
  return <Text>{typeof onLinkPress}</Text>
}

describe('RichTextContext', () => {
  it('provides registry, fonts, and onLinkPress to consumers', () => {
    const value = { registry: {}, fonts: undefined, onLinkPress: (_h: string) => {} }
    const tree = create(
      <RichTextContext.Provider value={value}>
        <Probe />
      </RichTextContext.Provider>,
    )
    // tree.toJSON() resolves to the host-level Text node whose children is the string array
    const json = tree.toJSON() as ReactTestRendererJSON
    expect(json.children).toEqual(['function'])
  })
})

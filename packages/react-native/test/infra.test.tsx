import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text, StyleSheet, Linking } from 'react-native'

describe('react-native mock + react-test-renderer', () => {
  it('renders mock host components with inspectable props', () => {
    const tree = create(
      <View style={{ margin: 5 }}>
        <Text style={{ color: 'red' }}>hi</Text>
      </View>,
    )
    const view = tree.root.findByType(View)
    expect(view.props.style).toEqual({ margin: 5 })
    const text = tree.root.findByType(Text)
    expect(text.props.style).toEqual({ color: 'red' })
  })

  it('StyleSheet.flatten merges arrays', () => {
    expect(StyleSheet.flatten([{ a: 1 }, null, { b: 2 }])).toEqual({ a: 1, b: 2 })
  })

  it('Linking.openURL is a spy', () => {
    void Linking.openURL('https://x.com')
    expect(Linking.openURL).toHaveBeenCalledWith('https://x.com')
  })
})

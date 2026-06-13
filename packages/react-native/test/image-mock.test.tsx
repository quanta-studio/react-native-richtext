import { describe, expect, it, vi } from 'vitest'
import { create } from 'react-test-renderer'
import { Image } from 'react-native'

describe('react-native Image mock', () => {
  it('renders a host Image with inspectable props', () => {
    const tree = create(<Image source={{ uri: 'x' }} style={{ width: 1 }} />)
    const hosts = tree.root.findAll((n) => (n.type as unknown) === 'Image')
    expect(hosts).toHaveLength(1)
    expect(hosts[0]!.props.source).toEqual({ uri: 'x' })
    expect(hosts[0]!.props.style).toEqual({ width: 1 })
  })

  it('exposes getSize as a spy', () => {
    expect(vi.isMockFunction(Image.getSize)).toBe(true)
  })
})

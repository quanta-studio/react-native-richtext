import { describe, expect, it, vi, beforeEach } from 'vitest'
import { create, act } from 'react-test-renderer'
import { Image, Text } from 'react-native'
import { RichText } from '../src'

beforeEach(() => {
  vi.mocked(Image.getSize).mockClear()
})

describe('integration: img', () => {
  it('renders a standalone <img> with explicit dims as an Image', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(
        <RichText source={{ html: '<img src="https://x/a.png" width="100" height="50">' }} />,
      )
    })
    const imgs = tree.root.findAllByType(Image)
    expect(imgs).toHaveLength(1)
    expect(imgs[0]!.props.source).toEqual({ uri: 'https://x/a.png' })
    expect(imgs[0]!.props.style).toMatchObject({ width: 100, height: 50 })
  })

  it('breaks a mid-paragraph img out as its own block, not inside the Text', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(
        <RichText
          source={{ html: '<p>before <img src="https://x/b.png" width="10" height="10"> after</p>' }}
        />,
      )
    })
    expect(tree.root.findAllByType(Image)).toHaveLength(1)
    // The img must NOT be a descendant of any Text (it broke out as a block).
    const imgInsideText = tree.root.findAllByType(Text).some((t) => t.findAllByType(Image).length > 0)
    expect(imgInsideText).toBe(false)
  })
})

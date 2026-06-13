import { describe, expect, it, vi, beforeEach } from 'vitest'
import { create, act } from 'react-test-renderer'
import { Image } from 'react-native'
import { Img } from '../src/renderers/Img'
import { defaultRenderers } from '../src/renderers/defaults'
import type { BlockNode } from '@yk-yong/rn-rich-text-core'

const imgNode = (
  attribs: Record<string, string>,
  style: Record<string, unknown> = {},
): BlockNode => ({
  type: 'block',
  tag: 'img',
  style,
  control: { display: 'block', whiteSpace: 'normal' },
  attribs,
  children: [],
  key: '0',
})

const images = (tree: ReturnType<typeof create>) => tree.root.findAllByType(Image)

beforeEach(() => {
  vi.mocked(Image.getSize).mockClear()
})

describe('Img', () => {
  it('renders an Image with explicit dimensions and does not call getSize', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<Img node={imgNode({ src: 'https://x/a.png', width: '100', height: '50' })} />)
    })
    const img = images(tree)[0]!
    expect(img.props.source).toEqual({ uri: 'https://x/a.png' })
    expect(img.props.style).toMatchObject({ width: 100, height: 50 })
    expect(Image.getSize).not.toHaveBeenCalled()
  })

  it('fetches the intrinsic size for a dimensionless image and renders with aspectRatio', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<Img node={imgNode({ src: 'https://x/b.png' })} />)
    })
    expect(Image.getSize).toHaveBeenCalledTimes(1)
    expect(vi.mocked(Image.getSize).mock.calls[0]![0]).toBe('https://x/b.png')
    expect(images(tree)).toHaveLength(0) // nothing rendered before the size resolves

    const onSuccess = vi.mocked(Image.getSize).mock.calls[0]![1]
    act(() => {
      onSuccess(400, 200)
    })
    expect(images(tree)[0]!.props.style).toMatchObject({ aspectRatio: 2, maxWidth: '100%' })
  })

  it('renders nothing without a src', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<Img node={imgNode({})} />)
    })
    expect(images(tree)).toHaveLength(0)
  })

  it('sets accessibilityLabel from alt', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(
        <Img node={imgNode({ src: 'https://x/c.png', width: '10', height: '10', alt: 'a cat' })} />,
      )
    })
    expect(images(tree)[0]!.props.accessibilityLabel).toBe('a cat')
  })

  it('treats empty width/height attributes as missing and fetches the intrinsic size', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<Img node={imgNode({ src: 'https://x/d.png', width: '', height: '' })} />)
    })
    expect(Image.getSize).toHaveBeenCalledTimes(1)
    const onSuccess = vi.mocked(Image.getSize).mock.calls[0]![1]
    act(() => {
      onSuccess(300, 150)
    })
    expect(images(tree)[0]!.props.style).toMatchObject({ aspectRatio: 2, maxWidth: '100%' })
  })

  it('is registered as the img default renderer', () => {
    expect(defaultRenderers.img).toBe(Img)
  })
})

import { describe, expect, it } from 'vitest'
import { imageStyle } from '../src/renderers/image-style'

describe('imageStyle', () => {
  it('uses explicit width and height when both present', () => {
    expect(imageStyle({ explicitWidth: 100, explicitHeight: 50, viewStyle: { margin: 4 } })).toEqual({
      margin: 4,
      width: 100,
      height: 50,
    })
  })

  it('uses the intrinsic ratio capped to the container when no explicit dims', () => {
    expect(imageStyle({ intrinsic: { width: 200, height: 100 }, viewStyle: {} })).toEqual({
      width: 200,
      maxWidth: '100%',
      aspectRatio: 2,
    })
  })

  it('uses an explicit width with the intrinsic ratio', () => {
    expect(
      imageStyle({ explicitWidth: 80, intrinsic: { width: 200, height: 100 }, viewStyle: {} }),
    ).toEqual({ width: 80, maxWidth: '100%', aspectRatio: 2 })
  })

  it('returns null while the intrinsic size is still loading', () => {
    expect(imageStyle({ viewStyle: {} })).toBeNull()
  })

  it('preserves box props', () => {
    expect(
      imageStyle({ intrinsic: { width: 10, height: 10 }, viewStyle: { marginTop: 8 } }),
    ).toMatchObject({ marginTop: 8 })
  })
})

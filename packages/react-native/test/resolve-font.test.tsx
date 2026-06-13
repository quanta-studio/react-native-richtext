import { describe, expect, it } from 'vitest'
import { resolveFont } from '../src/fonts/resolve-font'
import type { FontMap } from '../src/types'

const fonts: FontMap = {
  Montserrat: {
    '400': { normal: 'Montserrat-Regular', italic: 'Montserrat-Italic' },
    '700': { normal: 'Montserrat-Bold', italic: 'Montserrat-BoldItalic' },
  },
}

describe('resolveFont', () => {
  it('maps bold to a concrete face and drops weight/style', () => {
    expect(resolveFont({ fontFamily: 'Montserrat', fontWeight: 'bold' }, fonts)).toEqual({
      fontFamily: 'Montserrat-Bold',
    })
  })

  it('maps italic', () => {
    expect(resolveFont({ fontFamily: 'Montserrat', fontStyle: 'italic' }, fonts)).toEqual({
      fontFamily: 'Montserrat-Italic',
    })
  })

  it('maps bold italic via numeric weight', () => {
    expect(
      resolveFont({ fontFamily: 'Montserrat', fontWeight: '700', fontStyle: 'italic' }, fonts),
    ).toEqual({ fontFamily: 'Montserrat-BoldItalic' })
  })

  it('keeps other style props', () => {
    expect(resolveFont({ fontFamily: 'Montserrat', fontWeight: 'bold', color: 'red' }, fonts)).toEqual({
      fontFamily: 'Montserrat-Bold',
      color: 'red',
    })
  })

  it('passes through when the family/face is not registered', () => {
    expect(resolveFont({ fontFamily: 'Arial', fontWeight: 'bold' }, fonts)).toEqual({
      fontFamily: 'Arial',
      fontWeight: 'bold',
    })
    expect(resolveFont({ color: 'red' }, undefined)).toEqual({ color: 'red' })
  })

  it('uses the first family from a comma list', () => {
    expect(resolveFont({ fontFamily: '"Montserrat", sans-serif', fontWeight: 'bold' }, fonts)).toEqual({
      fontFamily: 'Montserrat-Bold',
    })
  })
})

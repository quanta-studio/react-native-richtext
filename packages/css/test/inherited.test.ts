import { describe, expect, it } from 'vitest'
import { INHERITED, isInherited } from '../src/inherit/inherited'

describe('INHERITED', () => {
  it('includes the inherited text + control props', () => {
    for (const p of [
      'color',
      'fontSize',
      'fontFamily',
      'lineHeight',
      'textAlign',
      'whiteSpace',
      'listStyleType',
    ]) {
      expect(isInherited(p)).toBe(true)
    }
  })

  it('excludes non-inherited props', () => {
    for (const p of [
      'margin',
      'marginTop',
      'padding',
      'width',
      'display',
      'backgroundColor',
      'borderWidth',
    ]) {
      expect(isInherited(p)).toBe(false)
    }
  })

  it('exposes a stable set', () => {
    expect(INHERITED.has('color')).toBe(true)
  })
})

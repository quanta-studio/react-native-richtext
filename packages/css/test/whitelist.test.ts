import { describe, expect, it } from 'vitest'
import { classifyProp } from '../src/mapping/whitelist'

describe('classifyProp', () => {
  it('classifies style props', () => {
    expect(classifyProp('color')).toBe('style')
    expect(classifyProp('marginTop')).toBe('style')
    expect(classifyProp('backgroundColor')).toBe('style')
  })

  it('classifies shorthand style props (expanded later by css-to-react-native)', () => {
    expect(classifyProp('margin')).toBe('style')
    expect(classifyProp('padding')).toBe('style')
  })

  it('classifies control props', () => {
    expect(classifyProp('display')).toBe('control')
    expect(classifyProp('whiteSpace')).toBe('control')
    expect(classifyProp('listStyleType')).toBe('control')
  })

  it('classifies unsupported props', () => {
    expect(classifyProp('float')).toBe('unsupported')
    expect(classifyProp('position')).toBe('unsupported')
    expect(classifyProp('WebkitBoxShadow')).toBe('unsupported')
  })
})

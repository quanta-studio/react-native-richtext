import { describe, expect, it } from 'vitest'
import { toAlpha, toRoman, mapTypeAttr, orderedMarker } from '../src/list-style'

describe('toAlpha', () => {
  it.each<[number, string]>([
    [1, 'a'], [2, 'b'], [26, 'z'], [27, 'aa'], [28, 'ab'], [52, 'az'], [53, 'ba'], [703, 'aaa'],
  ])('%i -> %s', (n, expected) => {
    expect(toAlpha(n, false)).toBe(expected)
  })
  it('upper-cases', () => {
    expect(toAlpha(27, true)).toBe('AA')
  })
})

describe('toRoman', () => {
  it.each<[number, string]>([
    [1, 'i'], [4, 'iv'], [9, 'ix'], [40, 'xl'], [90, 'xc'], [2024, 'mmxxiv'], [3999, 'mmmcmxcix'],
  ])('%i -> %s', (n, expected) => {
    expect(toRoman(n, false)).toBe(expected)
  })
  it('upper-cases', () => {
    expect(toRoman(4, true)).toBe('IV')
  })
  it('falls back to decimal outside 1..3999', () => {
    expect(toRoman(0, false)).toBe('0')
    expect(toRoman(4000, false)).toBe('4000')
  })
})

describe('mapTypeAttr', () => {
  it.each<[string | undefined, string | undefined]>([
    ['a', 'lower-alpha'], ['A', 'upper-alpha'], ['i', 'lower-roman'], ['I', 'upper-roman'],
    ['1', 'decimal'], ['x', undefined], [undefined, undefined],
  ])('%s -> %s', (type, expected) => {
    expect(mapTypeAttr(type)).toBe(expected)
  })
})

describe('orderedMarker', () => {
  it.each<[number, string, string]>([
    [1, 'decimal', '1.'], [3, 'lower-alpha', 'c.'], [3, 'upper-alpha', 'C.'],
    [4, 'lower-roman', 'iv.'], [4, 'upper-roman', 'IV.'], [2, 'unknown-style', '2.'],
  ])('%i %s -> %s', (index, type, expected) => {
    expect(orderedMarker(index, type)).toBe(expected)
  })
})

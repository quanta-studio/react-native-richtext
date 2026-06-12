import { describe, expect, it } from 'vitest'
import { specificity } from '../src/specificity/specificity'

describe('specificity', () => {
  it.each<[string, [number, number, number]]>([
    ['*', [0, 0, 0]],
    ['li', [0, 0, 1]],
    ['ul li', [0, 0, 2]],
    ['ul > li', [0, 0, 2]],
    ['.note', [0, 1, 0]],
    ['li.note', [0, 1, 1]],
    ['#main', [1, 0, 0]],
    ['#main .note p', [1, 1, 1]],
    ['a[href]', [0, 1, 1]],
    ['li:first-child', [0, 1, 1]],
    ['p::first-line', [0, 0, 2]],
  ])('specificity(%s) === %j', (selector, expected) => {
    expect(specificity(selector)).toEqual(expected)
  })
})

import { compareSpecificity } from '../src/specificity/specificity'

describe('compareSpecificity', () => {
  it('orders by a, then b, then c', () => {
    expect(compareSpecificity([1, 0, 0], [0, 9, 9]) > 0).toBe(true)
    expect(compareSpecificity([0, 1, 0], [0, 0, 9]) > 0).toBe(true)
    expect(compareSpecificity([0, 0, 1], [0, 0, 1])).toBe(0)
  })
})

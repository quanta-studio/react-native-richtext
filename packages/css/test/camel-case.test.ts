import { describe, expect, it } from 'vitest'
import { camelCase } from '../src/util/camel-case'

describe('camelCase', () => {
  it.each([
    ['color', 'color'],
    ['background-color', 'backgroundColor'],
    ['border-top-width', 'borderTopWidth'],
    ['-webkit-box-shadow', 'WebkitBoxShadow'],
    ['MARGIN-TOP', 'marginTop'],
  ])('%s -> %s', (input, expected) => {
    expect(camelCase(input)).toBe(expected)
  })
})

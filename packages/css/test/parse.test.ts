import { describe, expect, it } from 'vitest'
import { parseStylesheet } from '../src/parse/parse-stylesheet'
import { parseInline } from '../src/parse/parse-inline'

describe('parseStylesheet', () => {
  it('splits selector lists into one rule each', () => {
    const rules = parseStylesheet('h1, h2 { color: red; margin: 0 }')
    expect(rules.map((r) => r.selector)).toEqual(['h1', 'h2'])
    expect(rules[0]!.declarations).toEqual([
      { property: 'color', value: 'red', important: false },
      { property: 'margin', value: '0', important: false },
    ])
  })

  it('captures !important', () => {
    const rules = parseStylesheet('p { color: blue !important }')
    expect(rules[0]!.declarations[0]).toEqual({ property: 'color', value: 'blue', important: true })
  })

  it('skips at-rules like @media', () => {
    const rules = parseStylesheet('@media screen { p { color: red } } div { color: blue }')
    expect(rules.map((r) => r.selector)).toEqual(['div'])
  })

  it('returns [] for empty or comment-only input', () => {
    expect(parseStylesheet('/* nothing */')).toEqual([])
  })
})

describe('parseInline', () => {
  it('parses an inline style attribute', () => {
    expect(parseInline('color: red; font-size: 14px')).toEqual([
      { property: 'color', value: 'red', important: false },
      { property: 'font-size', value: '14px', important: false },
    ])
  })

  it('captures !important and tolerates trailing semicolons', () => {
    expect(parseInline('color: red !important;')).toEqual([
      { property: 'color', value: 'red', important: true },
    ])
  })
})

import { describe, expect, it } from 'vitest'
import { cascade } from '../src/cascade/cascade'
import { Tier } from '../src/types'
import type { Rule } from '../src/types'

const rule = (origin: number, spec: [number, number, number], order: number, prop: string, value: unknown, important = false): Rule => ({
  origin: origin as Rule['origin'],
  match: { kind: 'tag', tag: 'p' },
  specificity: spec,
  order,
  declarations: [{ prop: prop as never, value: value as never, important }],
})

describe('cascade', () => {
  it('higher tier wins regardless of specificity', () => {
    const out = cascade([
      rule(Tier.Style, [1, 0, 0], 0, 'color', 'red'),
      rule(Tier.Inline, [0, 0, 0], 1, 'color', 'blue'),
    ])
    expect(out.get('color')?.value).toBe('blue')
  })

  it('within a tier, higher specificity wins', () => {
    const out = cascade([
      rule(Tier.Style, [0, 0, 1], 0, 'color', 'red'),
      rule(Tier.Style, [0, 1, 0], 1, 'color', 'green'),
    ])
    expect(out.get('color')?.value).toBe('green')
  })

  it('within equal specificity, later source order wins', () => {
    const out = cascade([
      rule(Tier.Style, [0, 0, 1], 0, 'color', 'red'),
      rule(Tier.Style, [0, 0, 1], 1, 'color', 'green'),
    ])
    expect(out.get('color')?.value).toBe('green')
  })

  it('!important beats everything below it', () => {
    const out = cascade([
      rule(Tier.Inline, [1, 0, 0], 5, 'color', 'blue'),
      rule(Tier.Style, [0, 0, 1], 0, 'color', 'red', true),
    ])
    expect(out.get('color')?.value).toBe('red')
  })

  it('keeps independent props', () => {
    const out = cascade([
      rule(Tier.Style, [0, 0, 1], 0, 'color', 'red'),
      rule(Tier.Style, [0, 0, 1], 1, 'fontSize', 12),
    ])
    expect(out.get('color')?.value).toBe('red')
    expect(out.get('fontSize')?.value).toBe(12)
  })
})

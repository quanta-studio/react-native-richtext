import { describe, expect, it } from 'vitest'
import { buildUaRules } from '../src/ua/ua-rules'
import { Tier } from '../src/types'

describe('buildUaRules', () => {
  const rules = buildUaRules()

  it('produces rules at the UA tier', () => {
    expect(rules.length).toBeGreaterThan(0)
    expect(rules.every((r) => r.origin === Tier.UA)).toBe(true)
  })

  it('sets block display for p and inline for span', () => {
    const find = (sel: string) =>
      rules.filter((r) => r.match.kind === 'selector' && r.match.selector === sel)
    const pDisplay = find('p')
      .flatMap((r) => r.declarations)
      .find((d) => d.prop === 'display')
    const spanDisplay = find('span')
      .flatMap((r) => r.declarations)
      .find((d) => d.prop === 'display')
    expect(pDisplay?.value).toBe('block')
    expect(spanDisplay?.value).toBe('inline')
  })

  it('makes h1 bold via font-weight', () => {
    const h1 = rules.filter((r) => r.match.kind === 'selector' && r.match.selector === 'h1')
    const weight = h1.flatMap((r) => r.declarations).find((d) => d.prop === 'fontWeight')
    expect(weight?.value).toBe('bold')
  })

  it('assigns specificity and incrementing order', () => {
    expect(rules[0]!.specificity).toEqual([0, 0, 1])
    const orders = rules.map((r) => r.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})

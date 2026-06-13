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

  it('makes img display block', () => {
    const img = rules.filter((r) => r.match.kind === 'selector' && r.match.selector === 'img')
    const display = img.flatMap((r) => r.declarations).find((d) => d.prop === 'display')
    expect(display?.value).toBe('block')
  })

  it('gives blockquote a left border', () => {
    const bq = rules.filter((r) => r.match.kind === 'selector' && r.match.selector === 'blockquote')
    const decls = bq.flatMap((r) => r.declarations)
    expect(decls.find((d) => d.prop === 'borderLeftWidth')?.value).toBe(4)
  })

  it('makes table display table', () => {
    const table = rules.filter((r) => r.match.kind === 'selector' && r.match.selector === 'table')
    const display = table.flatMap((r) => r.declarations).find((d) => d.prop === 'display')
    expect(display?.value).toBe('table')
  })

  it('makes th bold and centered', () => {
    const th = rules.filter((r) => r.match.kind === 'selector' && r.match.selector === 'th')
    const decls = th.flatMap((r) => r.declarations)
    expect(decls.find((d) => d.prop === 'fontWeight')?.value).toBe('bold')
    expect(decls.find((d) => d.prop === 'textAlign')?.value).toBe('center')
  })

  it('decorates del/strike with line-through and ins with underline', () => {
    const decoration = (sel: string) =>
      rules
        .filter((r) => r.match.kind === 'selector' && r.match.selector === sel)
        .flatMap((r) => r.declarations)
        .find((d) => d.prop === 'textDecorationLine')?.value
    expect(decoration('del')).toBe('line-through')
    expect(decoration('strike')).toBe('line-through')
    expect(decoration('ins')).toBe('underline')
  })
})

import { describe, expect, it } from 'vitest'
import { parse } from '@yk-yong/react-native-richtext-dom'
import { collectRules } from '../src/collect/collect-rules'
import { Tier } from '../src/types'

describe('collectRules', () => {
  it('includes UA rules', () => {
    const doc = parse('<p>x</p>')
    const { rules } = collectRules(doc, {})
    expect(rules.some((r) => r.origin === Tier.UA)).toBe(true)
  })

  it('adds tagStyles, classStyles, and baseStyle tiers', () => {
    const doc = parse('<p class="note">x</p>')
    const { rules } = collectRules(doc, {
      baseStyle: { color: 'black' },
      tagStyles: { p: { color: 'green' } },
      classStyles: { note: { color: 'blue' } },
    })
    expect(rules.find((r) => r.origin === Tier.Base)?.match.kind).toBe('element')
    expect(rules.find((r) => r.origin === Tier.Tag)?.match).toEqual({ kind: 'tag', tag: 'p' })
    expect(rules.find((r) => r.origin === Tier.Class)?.match).toEqual({
      kind: 'class',
      className: 'note',
    })
  })

  it('parses <style> blocks into author rules', () => {
    const doc = parse('<style>p { color: red }</style><p>x</p>')
    const { rules } = collectRules(doc, {})
    const styleRule = rules.find((r) => r.origin === Tier.Style)
    expect(styleRule?.match).toEqual({ kind: 'selector', selector: 'p' })
    expect(styleRule?.declarations[0]).toEqual({ prop: 'color', value: 'red', important: false })
  })

  it('parses inline style attributes into element-bound inline rules', () => {
    const doc = parse('<p style="color: red">x</p>')
    const { rules } = collectRules(doc, {})
    const inline = rules.find((r) => r.origin === Tier.Inline)
    expect(inline?.match.kind).toBe('element')
    expect(inline?.declarations[0]).toEqual({ prop: 'color', value: 'red', important: false })
  })

  it('collects diagnostics with tier + selector attached', () => {
    const doc = parse('<style>p { float: left }</style><p>x</p>')
    const { diagnostics } = collectRules(doc, {})
    expect(diagnostics).toContainEqual({
      property: 'float',
      value: 'left',
      reason: 'unknown-property',
      selector: 'p',
      tier: Tier.Style,
    })
  })
})

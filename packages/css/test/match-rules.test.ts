import { describe, expect, it } from 'vitest'
import { parse, getElementsByTagName } from '@yk-yong/rn-rich-text-dom'
import { matchRules } from '../src/match/match-rules'
import { Tier } from '../src/types'
import type { Rule } from '../src/types'

describe('matchRules', () => {
  it('matches a selector rule to descendant elements', () => {
    const doc = parse('<div><p>a</p><p>b</p></div>')
    const rule: Rule = { origin: Tier.Style, match: { kind: 'selector', selector: 'div > p' }, specificity: [0, 0, 2], order: 0, declarations: [] }
    const matched = matchRules(doc, [rule])
    const ps = getElementsByTagName('p', doc)
    expect(matched.get(ps[0]!)).toContain(rule)
    expect(matched.get(ps[1]!)).toContain(rule)
  })

  it('matches a tag rule by tag name', () => {
    const doc = parse('<p>a</p><span>b</span>')
    const rule: Rule = { origin: Tier.Tag, match: { kind: 'tag', tag: 'p' }, specificity: [0, 0, 1], order: 0, declarations: [] }
    const matched = matchRules(doc, [rule])
    const p = getElementsByTagName('p', doc)[0]!
    const span = getElementsByTagName('span', doc)[0]!
    expect(matched.get(p)).toContain(rule)
    expect(matched.get(span)).toBeUndefined()
  })

  it('matches a class rule by class token', () => {
    const doc = parse('<p class="a note">x</p>')
    const rule: Rule = { origin: Tier.Class, match: { kind: 'class', className: 'note' }, specificity: [0, 1, 0], order: 0, declarations: [] }
    const matched = matchRules(doc, [rule])
    const p = getElementsByTagName('p', doc)[0]!
    expect(matched.get(p)).toContain(rule)
  })

  it('matches an element-bound rule to exactly that element', () => {
    const doc = parse('<p>a</p><p>b</p>')
    const p0 = getElementsByTagName('p', doc)[0]!
    const rule: Rule = { origin: Tier.Inline, match: { kind: 'element', element: p0 }, specificity: [1, 0, 0], order: 0, declarations: [] }
    const matched = matchRules(doc, [rule])
    expect(matched.get(p0)).toContain(rule)
    expect(matched.get(getElementsByTagName('p', doc)[1]!)).toBeUndefined()
  })
})

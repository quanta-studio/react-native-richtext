import { describe, expect, it } from 'vitest'
import type {
  RNStyle,
  RNDecl,
  Rule,
  Tier,
  TargetProp,
  ComputedStyle,
  DeferredLength,
  Diagnostic,
  ResolveOptions,
} from '../src/types'

describe('types', () => {
  it('constructs an RNDecl with a final value', () => {
    const d: RNDecl = { prop: 'color', value: '#ff0000', important: false }
    expect(d.prop).toBe('color')
  })

  it('constructs an RNDecl with a deferred length', () => {
    const def: DeferredLength = { kind: 'deferred-length', unit: 'em', number: 1.5, prop: 'fontSize' }
    const d: RNDecl = { prop: 'fontSize', value: def, important: false }
    expect((d.value as DeferredLength).unit).toBe('em')
  })

  it('constructs a Rule and ComputedStyle', () => {
    const rule: Rule = {
      origin: 4 as Tier,
      match: { kind: 'selector', selector: 'p' },
      specificity: [0, 0, 1],
      order: 0,
      declarations: [{ prop: 'color', value: 'red', important: false }],
    }
    expect(rule.match.kind).toBe('selector')

    const computed: ComputedStyle = {
      style: { color: 'red', fontSize: 16 },
      control: { display: 'block', whiteSpace: 'normal' },
    }
    expect(computed.control.display).toBe('block')

    const target: TargetProp = 'display'
    const diag: Diagnostic = { property: 'float', value: 'left', reason: 'unknown-property', tier: 4 as Tier }
    const opts: ResolveOptions = { rootFontSize: 16, collectDiagnostics: true }
    expect([target, diag.reason, opts.rootFontSize]).toEqual(['display', 'unknown-property', 16])
  })
})

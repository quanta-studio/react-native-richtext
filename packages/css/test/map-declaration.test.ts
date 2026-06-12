import { describe, expect, it } from 'vitest'
import { mapDeclaration } from '../src/mapping/map-declaration'
import type { DeferredLength } from '../src/types'

describe('mapDeclaration', () => {
  it('maps a simple context-free declaration', () => {
    const out = mapDeclaration({ property: 'color', value: 'red', important: false })
    expect(out.decls).toEqual([{ prop: 'color', value: 'red', important: false }])
    expect(out.diagnostics).toEqual([])
  })

  it('expands a context-free shorthand via css-to-react-native', () => {
    const out = mapDeclaration({ property: 'margin', value: '1px 2px', important: false })
    expect(out.decls).toEqual([
      { prop: 'marginTop', value: 1, important: false },
      { prop: 'marginRight', value: 2, important: false },
      { prop: 'marginBottom', value: 1, important: false },
      { prop: 'marginLeft', value: 2, important: false },
    ])
  })

  it('routes a control prop into a control decl', () => {
    const out = mapDeclaration({ property: 'display', value: 'block', important: false })
    expect(out.decls).toEqual([{ prop: 'display', value: 'block', important: false }])
  })

  it('defers a relative-unit value', () => {
    const out = mapDeclaration({ property: 'font-size', value: '1.5em', important: false })
    const v = out.decls[0]!.value as DeferredLength
    expect(v).toEqual({ kind: 'deferred-length', unit: 'em', number: 1.5, prop: 'fontSize' })
  })

  it('preserves !important', () => {
    const out = mapDeclaration({ property: 'color', value: 'blue', important: true })
    expect(out.decls[0]!.important).toBe(true)
  })

  it('emits unknown-property diagnostic and no decls', () => {
    const out = mapDeclaration({ property: 'float', value: 'left', important: false })
    expect(out.decls).toEqual([])
    expect(out.diagnostics).toEqual([
      { property: 'float', value: 'left', reason: 'unknown-property' },
    ])
  })

  it('emits unsupported-value diagnostic for unmappable values like calc()', () => {
    const out = mapDeclaration({ property: 'width', value: 'calc(100% - 10px)', important: false })
    expect(out.decls).toEqual([])
    expect(out.diagnostics[0]!.reason).toBe('unsupported-value')
  })

  it('defers a % font-size through mapDeclaration', () => {
    const out = mapDeclaration({ property: 'font-size', value: '120%', important: false })
    expect(out.decls[0]!.value).toEqual({
      kind: 'deferred-length',
      unit: '%',
      number: 120,
      prop: 'fontSize',
    })
  })

  it('defers a % line-height through mapDeclaration', () => {
    const out = mapDeclaration({ property: 'line-height', value: '150%', important: false })
    expect(out.decls[0]!.value).toEqual({
      kind: 'deferred-length',
      unit: '%',
      number: 150,
      prop: 'lineHeight',
    })
  })

  it('passes a layout % through as a string', () => {
    const out = mapDeclaration({ property: 'width', value: '50%', important: false })
    expect(out.decls).toEqual([{ prop: 'width', value: '50%', important: false }])
  })
})

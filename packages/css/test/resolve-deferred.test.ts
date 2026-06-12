import { describe, expect, it } from 'vitest'
import { resolveDeferred } from '../src/units/resolve-deferred'
import type { DeferredLength } from '../src/types'

const ctx = { ownFontSize: 20, parentFontSize: 16, rootFontSize: 16 }
const d = (unit: DeferredLength['unit'], number: number, prop: string): DeferredLength =>
  ({ kind: 'deferred-length', unit, number, prop: prop as DeferredLength['prop'] })

describe('resolveDeferred', () => {
  it('em on font-size uses the parent font-size', () => {
    expect(resolveDeferred(d('em', 1.5, 'fontSize'), ctx)).toBe(24) // 1.5 * 16
  })

  it('em on a non-font-size prop uses the own font-size', () => {
    expect(resolveDeferred(d('em', 2, 'marginTop'), ctx)).toBe(40) // 2 * 20
  })

  it('rem uses the root font-size', () => {
    expect(resolveDeferred(d('rem', 2, 'width'), ctx)).toBe(32) // 2 * 16
  })

  it('% on font-size uses the parent font-size', () => {
    expect(resolveDeferred(d('%', 150, 'fontSize'), ctx)).toBe(24) // 1.5 * 16
  })

  it('% on line-height uses the own font-size', () => {
    expect(resolveDeferred(d('%', 150, 'lineHeight'), ctx)).toBe(30) // 1.5 * 20
  })

  it('unitless line-height multiplies the own font-size', () => {
    expect(resolveDeferred(d('unitless', 1.5, 'lineHeight'), ctx)).toBe(30) // 1.5 * 20
  })
})

import { describe, expect, it } from 'vitest'
import { computeElement, ROOT_PARENT } from '../src/resolve/compute-element'
import type { ComputedStyle, DeferredLength } from '../src/types'
import type { SpecifiedStyle } from '../src/cascade/cascade'

const root = (fontSize: number): ComputedStyle => ({
  ...ROOT_PARENT,
  style: { ...ROOT_PARENT.style, fontSize },
})
const spec = (entries: [string, unknown][]): SpecifiedStyle =>
  new Map(entries.map(([p, v]) => [p as never, { value: v as never, important: false }]))

describe('computeElement', () => {
  it('inherits color and font-size from the parent', () => {
    const parent = root(16)
    parent.style.color = 'blue'
    const out = computeElement(spec([]), parent, 16)
    expect(out.style.color).toBe('blue')
    expect(out.style.fontSize).toBe(16)
  })

  it('does not inherit non-inherited props like margin', () => {
    const parent = root(16)
    parent.style.marginTop = 10
    const out = computeElement(spec([]), parent, 16)
    expect(out.style.marginTop).toBeUndefined()
  })

  it('resolves an em font-size against the parent font-size', () => {
    const fs: DeferredLength = { kind: 'deferred-length', unit: 'em', number: 2, prop: 'fontSize' }
    const out = computeElement(spec([['fontSize', fs]]), root(16), 16)
    expect(out.style.fontSize).toBe(32)
  })

  it('resolves an em margin against the element own font-size', () => {
    const fs: DeferredLength = { kind: 'deferred-length', unit: 'em', number: 2, prop: 'fontSize' }
    const mt: DeferredLength = { kind: 'deferred-length', unit: 'em', number: 1, prop: 'marginTop' }
    const out = computeElement(
      spec([
        ['fontSize', fs],
        ['marginTop', mt],
      ]),
      root(16),
      16,
    )
    expect(out.style.fontSize).toBe(32)
    expect(out.style.marginTop).toBe(32) // 1em * own 32
  })

  it('routes control props to control, not style', () => {
    const out = computeElement(spec([['display', 'block']]), root(16), 16)
    expect(out.control.display).toBe('block')
    expect((out.style as Record<string, unknown>)['display']).toBeUndefined()
  })

  it('passes a layout % through as a string', () => {
    const out = computeElement(spec([['width', '50%']]), root(16), 16)
    expect(out.style.width).toBe('50%')
  })
})

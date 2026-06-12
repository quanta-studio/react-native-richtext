import { describe, expect, it } from 'vitest'
import { expandDeferred } from '../src/mapping/expand-deferred'
import type { DeferredLength } from '../src/types'

const def = (unit: DeferredLength['unit'], number: number, prop: string): DeferredLength => ({
  kind: 'deferred-length',
  unit,
  number,
  prop: prop as DeferredLength['prop'],
})

describe('expandDeferred', () => {
  it('defers em on font-size', () => {
    expect(expandDeferred('fontSize', '1.5em')).toEqual([
      { prop: 'fontSize', value: def('em', 1.5, 'fontSize') },
    ])
  })

  it('defers rem on a single length prop', () => {
    expect(expandDeferred('width', '2rem')).toEqual([
      { prop: 'width', value: def('rem', 2, 'width') },
    ])
  })

  it('defers unitless line-height', () => {
    expect(expandDeferred('lineHeight', '1.5')).toEqual([
      { prop: 'lineHeight', value: def('unitless', 1.5, 'lineHeight') },
    ])
  })

  it('resolves % to a deferred number only for font-size and line-height', () => {
    expect(expandDeferred('fontSize', '120%')).toEqual([
      { prop: 'fontSize', value: def('%', 120, 'fontSize') },
    ])
    expect(expandDeferred('lineHeight', '150%')).toEqual([
      { prop: 'lineHeight', value: def('%', 150, 'lineHeight') },
    ])
  })

  it('passes % through as a string for layout props', () => {
    expect(expandDeferred('width', '50%')).toEqual([{ prop: 'width', value: '50%' }])
  })

  it('expands a box shorthand with mixed units', () => {
    expect(expandDeferred('margin', '1em 0')).toEqual([
      { prop: 'marginTop', value: def('em', 1, 'marginTop') },
      { prop: 'marginRight', value: 0 },
      { prop: 'marginBottom', value: def('em', 1, 'marginBottom') },
      { prop: 'marginLeft', value: 0 },
    ])
  })
})

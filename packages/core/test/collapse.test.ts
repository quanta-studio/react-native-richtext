import { describe, expect, it } from 'vitest'
import { collapseLeaves } from '../src/text/collapse'
import type { TextNode, LineBreakNode } from '../src/types'

const t = (text: string, key = '0'): TextNode => ({ type: 'text', text, key })
const br = (): LineBreakNode => ({ type: 'linebreak', key: 'b' })

describe('collapseLeaves (normal)', () => {
  it('collapses internal whitespace runs to single spaces', () => {
    const leaves = [t('a   b\n\tc')]
    collapseLeaves(leaves, 'normal')
    expect(leaves[0]!.text).toBe('a b c')
  })

  it('trims leading and trailing whitespace at container edges', () => {
    const leaves = [t('   hello   ')]
    collapseLeaves(leaves, 'normal')
    expect(leaves[0]!.text).toBe('hello')
  })

  it('dedupes whitespace across leaf boundaries', () => {
    const leaves = [t('a '), t(' b')]
    collapseLeaves(leaves, 'normal')
    expect(leaves.map((l) => (l as TextNode).text)).toEqual(['a ', 'b'])
  })

  it('preserves U+00A0 (nbsp) as non-collapsible', () => {
    const leaves = [t('a   b')]
    collapseLeaves(leaves, 'normal')
    expect(leaves[0]!.text).toBe('a   b')
  })

  it('treats a linebreak as a boundary that trims following leading space', () => {
    const leaves = [t('a '), br(), t(' b')]
    collapseLeaves(leaves, 'normal')
    expect((leaves[0] as TextNode).text).toBe('a ')
    expect((leaves[2] as TextNode).text).toBe('b')
  })
})

describe('collapseLeaves (pre / pre-line)', () => {
  it('pre preserves all whitespace', () => {
    const leaves = [t('  a\n  b  ')]
    collapseLeaves(leaves, 'pre')
    expect(leaves[0]!.text).toBe('  a\n  b  ')
  })
  it('pre-line collapses spaces but keeps newlines', () => {
    const leaves = [t('a   b\n\nc')]
    collapseLeaves(leaves, 'pre-line')
    expect(leaves[0]!.text).toBe('a b\n\nc')
  })
})

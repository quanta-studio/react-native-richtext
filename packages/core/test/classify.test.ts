import { describe, expect, it } from 'vitest'
import { parse, getElementsByTagName } from '@yk-yong/react-native-richtext-dom'
import { resolveStyles } from '@yk-yong/react-native-richtext-css'
import { isBlockLevel, isInlineLevel, isHidden, isNonRendered, displayOf } from '../src/classify'

describe('classify', () => {
  it('classifies display levels', () => {
    expect(isBlockLevel('block')).toBe(true)
    expect(isBlockLevel('list-item')).toBe(true)
    expect(isBlockLevel('inline')).toBe(false)
    expect(isInlineLevel('inline')).toBe(true)
    expect(isInlineLevel('inline-block')).toBe(true)
    expect(isInlineLevel('block')).toBe(false)
    expect(isInlineLevel('none')).toBe(false)
  })

  it('flags non-rendered tags', () => {
    expect(isNonRendered('style')).toBe(true)
    expect(isNonRendered('script')).toBe(true)
    expect(isNonRendered('p')).toBe(false)
  })

  it('reads computed display and hidden from the styles map', () => {
    const doc = parse('<p>x</p><span>y</span>')
    const { styles } = resolveStyles(doc)
    const p = getElementsByTagName('p', doc)[0]!
    const span = getElementsByTagName('span', doc)[0]!
    expect(displayOf(p, styles)).toBe('block')
    expect(displayOf(span, styles)).toBe('inline')
    expect(isHidden(p, styles)).toBe(false)
  })

  it('treats display:none as hidden', () => {
    const doc = parse('<p style="display:none">x</p>')
    const { styles } = resolveStyles(doc)
    const p = getElementsByTagName('p', doc)[0]!
    expect(isHidden(p, styles)).toBe(true)
  })

  it('treats table as block-level', () => {
    expect(isBlockLevel('table')).toBe(true)
  })
})

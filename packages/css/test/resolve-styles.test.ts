import { describe, expect, it } from 'vitest'
import { parse, getElementsByTagName } from '@quanta-studio/react-native-richtext-dom'
import { resolveStyles } from '../src/resolve/resolve-styles'

describe('resolveStyles', () => {
  it('computes UA defaults (p is block with em margins resolved)', () => {
    const doc = parse('<p>hello</p>')
    const { styles } = resolveStyles(doc)
    const p = getElementsByTagName('p', doc)[0]!
    const cs = styles.get(p)!
    expect(cs.control.display).toBe('block')
    expect(cs.style.marginTop).toBe(16) // 1em * 16
  })

  it('inherits color from a parent through the tree', () => {
    const doc = parse('<div style="color: red"><p><span>x</span></p></div>')
    const { styles } = resolveStyles(doc)
    const span = getElementsByTagName('span', doc)[0]!
    expect(styles.get(span)!.style.color).toBe('red')
  })

  it('applies the cascade: inline beats <style> beats tagStyles beats UA', () => {
    const doc = parse('<style>p { color: green }</style><p style="color: blue">x</p>')
    const { styles } = resolveStyles(doc, { tagStyles: { p: { color: 'orange' } } })
    const p = getElementsByTagName('p', doc)[0]!
    expect(styles.get(p)!.style.color).toBe('blue')
  })

  it('resolves h1 font-size (2em) against the root font-size', () => {
    const doc = parse('<h1>title</h1>')
    const { styles } = resolveStyles(doc, { rootFontSize: 10 })
    const h1 = getElementsByTagName('h1', doc)[0]!
    expect(styles.get(h1)!.style.fontSize).toBe(20)
  })

  it('returns empty diagnostics unless collectDiagnostics is set', () => {
    const doc = parse('<p style="float: left">x</p>')
    expect(resolveStyles(doc).diagnostics).toEqual([])
    const withDiag = resolveStyles(doc, { collectDiagnostics: true })
    expect(withDiag.diagnostics.some((d) => d.property === 'float')).toBe(true)
  })

  it('applies baseStyle to roots and inherits it down', () => {
    const doc = parse('<p><span>x</span></p>')
    const { styles } = resolveStyles(doc, { baseStyle: { color: '#123456' } })
    const span = getElementsByTagName('span', doc)[0]!
    expect(styles.get(span)!.style.color).toBe('#123456')
  })

  it('accumulates text-decoration through nested elements (line-through + underline)', () => {
    const doc = parse('<strike><u><i><b>x</b></i></u></strike>')
    const { styles } = resolveStyles(doc)
    const b = getElementsByTagName('b', doc)[0]!
    expect(styles.get(b)!.style.textDecorationLine).toBe('underline line-through')
  })

  it('keeps a single text-decoration unchanged', () => {
    const doc = parse('<u>x</u>')
    const { styles } = resolveStyles(doc)
    const u = getElementsByTagName('u', doc)[0]!
    expect(styles.get(u)!.style.textDecorationLine).toBe('underline')
  })

  it('does not add a decoration where there is none', () => {
    const doc = parse('<p><span>x</span></p>')
    const { styles } = resolveStyles(doc)
    const span = getElementsByTagName('span', doc)[0]!
    expect(styles.get(span)!.style.textDecorationLine).toBeUndefined()
  })
})

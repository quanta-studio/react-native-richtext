import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  parse,
  getElementsByTagName,
  findOne,
  isTag,
} from '@quanta-studio/react-native-richtext-dom'
import { resolveStyles } from '../src'

const html = readFileSync(
  fileURLToPath(new URL('./fixtures/article.html', import.meta.url)),
  'utf8',
)

describe('integration: article.html', () => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc, { baseStyle: { color: '#000000', fontSize: 16 } })
  const byTag = (t: string) => getElementsByTagName(t, doc)

  it('h1 is block, bold, 2em resolved to 32', () => {
    const cs = styles.get(byTag('h1')[0]!)!
    expect(cs.control.display).toBe('block')
    expect(cs.style.fontWeight).toBe('bold')
    expect(cs.style.fontSize).toBe(32)
  })

  it('.lead paragraph gets class font-size (1.25em -> 20) and color', () => {
    const lead = findOne((n) => isTag(n) && n.attribs['class'] === 'lead', doc.children, true)!
    const cs = styles.get(lead)!
    expect(cs.style.fontSize).toBe(20)
    expect(cs.style.color).toBe('#333333')
  })

  it('strong inside .lead inherits the 20px font-size and is bold', () => {
    const strong = byTag('strong')[0]!
    const cs = styles.get(strong)!
    expect(cs.style.fontSize).toBe(20)
    expect(cs.style.fontWeight).toBe('bold')
  })

  it('a is underlined and inline', () => {
    const cs = styles.get(byTag('a')[0]!)!
    expect(cs.control.display).toBe('inline')
    expect(cs.style.textDecorationLine).toBe('underline')
  })

  it('li elements are list-item', () => {
    expect(styles.get(byTag('li')[0]!)!.control.display).toBe('list-item')
  })

  it('blockquote color comes from the <style> block', () => {
    expect(styles.get(byTag('blockquote')[0]!)!.style.color).toBe('#666666')
  })
})

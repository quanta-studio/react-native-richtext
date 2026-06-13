import { describe, expect, it } from 'vitest'
import { parse } from '@yk-yong/react-native-richtext-dom'
import { resolveStyles } from '@yk-yong/react-native-richtext-css'
import { splitDocument } from '../src/split'
import { processText } from '../src/text/process-text'
import type { BlockNode, InlineContainerNode, InlineNode, TextNode } from '../src/types'

const run = (html: string) => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc)
  return processText(splitDocument(doc, styles))
}

describe('processText', () => {
  it('decodes entities and collapses text', () => {
    const tree = run('<p>a &amp;   b</p>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    expect((ic.children[0] as TextNode).text).toBe('a & b')
  })

  it('collapses across inline boundaries', () => {
    const tree = run('<p><b>a </b> b</p>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    const b = ic.children[0] as InlineNode
    expect((b.children[0] as TextNode).text).toBe('a ')
    expect((ic.children[1] as TextNode).text).toBe('b')
  })

  it('drops inter-block source whitespace (empty containers)', () => {
    const tree = run('<div>\n  <p>a</p>\n  <p>b</p>\n</div>')
    const div = tree[0] as BlockNode
    expect(div.children.map((c) => c.type)).toEqual(['block', 'block'])
  })

  it('preserves whitespace inside <pre>', () => {
    const tree = run('<pre>  a\n  b</pre>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    expect((ic.children[0] as TextNode).text).toBe('  a\n  b')
  })

  it('drops empty text nodes', () => {
    const tree = run('<p> <b></b> x</p>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    const texts = ic.children.filter((c): c is TextNode => c.type === 'text')
    expect(texts.every((t) => t.text.length > 0)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from '@yk-yong/rn-rich-text-dom'
import { resolveStyles } from '@yk-yong/rn-rich-text-css'
import { buildRenderTree } from '../src'
import type { BlockNode, InlineContainerNode, InlineNode, TextNode } from '../src'

const html = readFileSync(fileURLToPath(new URL('./fixtures/article.html', import.meta.url)), 'utf8')

const findBlock = (nodes: ReturnType<typeof buildRenderTree>, tag: string): BlockNode | undefined => {
  for (const n of nodes) {
    if (n.type === 'block') {
      if (n.tag === tag) return n
      const inner = findBlock(n.children, tag)
      if (inner) return inner
    }
  }
  return undefined
}

describe('integration: article.html', () => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc, { baseStyle: { fontSize: 16, color: '#000000' } })
  const tree = buildRenderTree(doc, styles)

  it('builds the article as a block with block children', () => {
    const article = findBlock(tree, 'article')!
    expect(article.type).toBe('block')
    expect(article.children.some((c) => c.type === 'block' && c.tag === 'h1')).toBe(true)
  })

  it('the intro paragraph collapses whitespace and keeps the link href', () => {
    const p = findBlock(tree, 'p')!
    const ic = p.children.find((c): c is InlineContainerNode => c.type === 'inline-container')!
    const a = ic.children.find((c): c is InlineNode => c.type === 'inline' && c.tag === 'a')!
    expect(a.attribs.href).toBe('https://example.com')
    const firstText = ic.children.find((c): c is TextNode => c.type === 'text')!
    expect(firstText.text.includes('  ')).toBe(false)
  })

  it('the list items get bullet markers', () => {
    const ul = findBlock(tree, 'ul')!
    const items = ul.children.filter((c): c is BlockNode => c.type === 'block' && c.tag === 'li')
    expect(items.map((li) => li.marker?.text)).toEqual(['•', '•'])
  })

  it('blockquote decodes smart quotes and nbsp', () => {
    const bq = findBlock(tree, 'blockquote')!
    const ic = bq.children.find((c): c is InlineContainerNode => c.type === 'inline-container')!
    const text = (ic.children.find((c): c is TextNode => c.type === 'text'))!.text
    expect(text).toContain('“') // &ldquo; decoded to LEFT DOUBLE QUOTATION MARK (U+201C)
    expect(text).toContain(' ')
  })

  it('pre preserves its internal whitespace and newline', () => {
    const pre = findBlock(tree, 'pre')!
    const ic = pre.children.find((c): c is InlineContainerNode => c.type === 'inline-container')!
    const text = (ic.children.find((c): c is TextNode => c.type === 'text'))!.text
    expect(text).toContain('\n')
    expect(text).toContain('  ')
  })
})

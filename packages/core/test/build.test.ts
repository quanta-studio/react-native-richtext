import { describe, expect, it } from 'vitest'
import { parse } from '@quanta-studio/react-native-richtext-dom'
import { resolveStyles } from '@quanta-studio/react-native-richtext-css'
import { buildRenderTree } from '../src'
import type { BlockNode, InlineContainerNode, TextNode } from '../src'

const build = (html: string) => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc)
  return buildRenderTree(doc, styles)
}

describe('buildRenderTree', () => {
  it('runs split -> processText -> markers end to end', () => {
    const tree = build('<ul><li>one &amp;  two</li></ul>')
    const ul = tree[0] as BlockNode
    expect(ul.tag).toBe('ul')
    const li = ul.children[0] as BlockNode
    expect(li.marker?.text).toBe('•')
    const ic = li.children[0] as InlineContainerNode
    expect((ic.children[0] as TextNode).text).toBe('one & two')
  })

  it('produces a clean paragraph with collapsed text', () => {
    const tree = build('<p>  hello   world  </p>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    expect((ic.children[0] as TextNode).text).toBe('hello world')
  })
})

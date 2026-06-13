import { describe, expect, it } from 'vitest'
import { parse } from '@yk-yong/react-native-richtext-dom'
import { resolveStyles } from '@yk-yong/react-native-richtext-css'
import { splitDocument } from '../src/split'
import type { BlockNode, InlineContainerNode, InlineNode } from '../src/types'

const build = (html: string) => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc)
  return splitDocument(doc, styles)
}

describe('splitDocument', () => {
  it('wraps a block of only inline content in one inline-container', () => {
    const tree = build('<p>hello <b>world</b></p>')
    expect(tree).toHaveLength(1)
    const p = tree[0] as BlockNode
    expect(p.type).toBe('block')
    expect(p.tag).toBe('p')
    expect(p.children).toHaveLength(1)
    const ic = p.children[0] as InlineContainerNode
    expect(ic.type).toBe('inline-container')
    expect(ic.children[0]).toMatchObject({ type: 'text', text: 'hello ' })
    expect(ic.children[1]).toMatchObject({ type: 'inline', tag: 'b' })
  })

  it('flushes inline runs around block children', () => {
    const tree = build('<div>before<p>mid</p>after</div>')
    const div = tree[0] as BlockNode
    expect(div.children.map((c) => c.type)).toEqual([
      'inline-container',
      'block',
      'inline-container',
    ])
    expect((div.children[1] as BlockNode).tag).toBe('p')
  })

  it('maps <br> to a linebreak node', () => {
    const tree = build('<p>a<br>b</p>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    expect(ic.children.map((c) => c.type)).toEqual(['text', 'linebreak', 'text'])
  })

  it('preserves href on <a> attribs', () => {
    const tree = build('<p><a href="https://x.com">link</a></p>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    const a = ic.children[0] as InlineNode
    expect(a.tag).toBe('a')
    expect(a.attribs.href).toBe('https://x.com')
  })

  it('drops display:none and non-rendered tags', () => {
    const tree = build('<style>p{}</style><p>x</p><span style="display:none">y</span>')
    expect(tree).toHaveLength(1)
    expect((tree[0] as BlockNode).tag).toBe('p')
  })

  it('groups top-level inline content into an inline-container', () => {
    const tree = build('<b>hi</b>')
    expect(tree).toHaveLength(1)
    expect(tree[0]!.type).toBe('inline-container')
  })

  it('assigns deterministic path keys', () => {
    const tree = build('<div><p>a</p></div>')
    const div = tree[0] as BlockNode
    expect(div.key).toBe('0')
    expect((div.children[0] as BlockNode).key).toBe('0.0')
  })
})

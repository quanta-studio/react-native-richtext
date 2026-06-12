import { describe, expect, it } from 'vitest'
import { parse } from '../src'
import type { Comment, Element, Text } from '../src'

describe('parse', () => {
  it('returns a Document for a simple element', () => {
    const doc = parse('<p>hello</p>')
    expect(doc.type).toBe('root')
    expect(doc.children).toHaveLength(1)
    const p = doc.children[0] as Element
    expect(p.type).toBe('tag')
    expect(p.name).toBe('p')
    expect((p.children[0] as Text).data).toBe('hello')
  })

  it('preserves nesting', () => {
    const doc = parse('<div><p>1</p><p>2</p></div>')
    const div = doc.children[0] as Element
    expect(div.name).toBe('div')
    const ps = div.children.filter((n): n is Element => n.type === 'tag')
    expect(ps).toHaveLength(2)
    expect((ps[0]!.children[0] as Text).data).toBe('1')
    expect((ps[1]!.children[0] as Text).data).toBe('2')
  })

  it('parses attributes (lower-cased names)', () => {
    const doc = parse('<a href="/x" class="y z" data-id="1">t</a>')
    const a = doc.children[0] as Element
    expect(a.attribs).toEqual({ href: '/x', class: 'y z', 'data-id': '1' })
  })

  it('treats void elements as childless', () => {
    const doc = parse('<p>a<br>b</p>')
    const p = doc.children[0] as Element
    expect(p.children).toHaveLength(3)
    const br = p.children[1] as Element
    expect(br.type).toBe('tag')
    expect(br.name).toBe('br')
    expect(br.children).toHaveLength(0)
    expect((p.children[0] as Text).data).toBe('a')
    expect((p.children[2] as Text).data).toBe('b')
  })

  it('keeps comments as comment nodes', () => {
    const doc = parse('<!-- hi -->')
    const c = doc.children[0] as Comment
    expect(c.type).toBe('comment')
    expect(c.data).toBe(' hi ')
  })

  it('leaves HTML entities raw (decoded later in the render layer)', () => {
    const doc = parse('<p>a &amp; b &lt;c&gt;</p>')
    const p = doc.children[0] as Element
    expect((p.children[0] as Text).data).toBe('a &amp; b &lt;c&gt;')
  })

  it('does not throw on malformed input and still nests recoverable text', () => {
    expect(() => parse('<div><span>oops')).not.toThrow()
    const doc = parse('<div><span>oops')
    const div = doc.children[0] as Element
    const span = div.children[0] as Element
    expect(span.name).toBe('span')
    expect((span.children[0] as Text).data).toBe('oops')
  })

  it('applies the HTML quirk where a stray </p> generates an empty <p>', () => {
    // Per the HTML spec (and browsers), an end tag </p> with no open <p> in scope
    // produces an empty <p> element. htmlparser2 v12 implements this in HTML mode.
    expect(() => parse('<div></p></div>')).not.toThrow()
    const doc = parse('<div></p></div>')
    const div = doc.children[0] as Element
    expect(div.name).toBe('div')
    const elements = div.children.filter((n): n is Element => n.type === 'tag')
    expect(elements).toHaveLength(1)
    expect(elements[0]!.name).toBe('p')
    expect(elements[0]!.children).toHaveLength(0)
  })
})

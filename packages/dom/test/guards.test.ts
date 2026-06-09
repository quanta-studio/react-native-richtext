import { describe, expect, it } from 'vitest'
import { parse, isComment, isDocument, isTag, isText, hasChildren } from '../src'
import type { Element } from '../src'

describe('node guards', () => {
  const doc = parse('<div>hi<!-- c --></div>')
  const div = doc.children[0] as Element
  const text = div.children[0]
  const comment = div.children[1]

  it('isDocument identifies the root', () => {
    expect(isDocument(doc)).toBe(true)
    expect(isDocument(div)).toBe(false)
  })

  it('isTag identifies elements', () => {
    expect(isTag(div)).toBe(true)
    expect(isTag(text)).toBe(false)
  })

  it('isText identifies text nodes', () => {
    expect(isText(text)).toBe(true)
    expect(isText(div)).toBe(false)
  })

  it('isComment identifies comments', () => {
    expect(isComment(comment)).toBe(true)
    expect(isComment(text)).toBe(false)
  })

  it('hasChildren is true for elements and documents', () => {
    expect(hasChildren(div)).toBe(true)
    expect(hasChildren(doc)).toBe(true)
    expect(hasChildren(text)).toBe(false)
  })
})

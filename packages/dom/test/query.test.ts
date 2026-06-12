import { describe, expect, it } from 'vitest'
import {
  parse,
  findAll,
  findOne,
  getAttributeValue,
  getElementById,
  getElementsByTagName,
  getName,
  getText,
  nextElementSibling,
  prevElementSibling,
  textContent,
} from '../src'
import type { Element } from '../src'

describe('query helpers', () => {
  const html =
    '<article id="root"><h1>Title</h1><p class="lead">Hello <b>World</b></p><p>Second</p></article>'
  const doc = parse(html)

  it('getElementsByTagName finds all matching elements', () => {
    expect(getElementsByTagName('p', doc)).toHaveLength(2)
  })

  it('getElementById finds by id', () => {
    const el = getElementById('root', doc)
    expect(el && getName(el)).toBe('article')
  })

  it('findOne returns the first match', () => {
    const h1 = findOne((el) => el.name === 'h1', doc.children)
    expect(h1 && getText(h1)).toBe('Title')
  })

  it('findAll returns every match', () => {
    expect(findAll((el) => el.name === 'p', doc.children)).toHaveLength(2)
  })

  it('getText concatenates descendant text', () => {
    const lead = findOne((el) => el.attribs.class === 'lead', doc.children)
    expect(lead && getText(lead)).toBe('Hello World')
  })

  it('textContent mirrors DOM textContent (comments excluded)', () => {
    expect(textContent(doc)).toBe('TitleHello WorldSecond')
  })

  it('getAttributeValue reads attributes', () => {
    const article = getElementById('root', doc)!
    expect(getAttributeValue(article, 'id')).toBe('root')
  })

  it('navigates element siblings', () => {
    const firstP = getElementsByTagName('p', doc)[0]!
    const next = nextElementSibling(firstP) as Element
    expect(getName(next)).toBe('p')
    expect(getText(next)).toBe('Second')
    const prev = prevElementSibling(firstP) as Element
    expect(getName(prev)).toBe('h1')
  })
})

import { describe, expect, it } from 'vitest'
import { decodeText } from '../src/text/decode'

describe('decodeText', () => {
  it('decodes named entities', () => {
    expect(decodeText('a &amp; b &lt;c&gt;')).toBe('a & b <c>')
  })
  it('decodes numeric entities', () => {
    expect(decodeText('&#169; &#x2014;')).toBe('© —')
  })
  it('decodes &nbsp; to U+00A0', () => {
    expect(decodeText('a&nbsp;b')).toBe('a b')
  })
  it('leaves plain text unchanged', () => {
    expect(decodeText('plain text')).toBe('plain text')
  })
})

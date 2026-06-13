import { describe, expect, it } from 'vitest'
import type { RichTextProps, Renderer, FontMap } from '../src/types'

describe('types', () => {
  it('constructs the public prop shapes', () => {
    const fonts: FontMap = {
      Montserrat: { '700': { normal: 'Montserrat-Bold', italic: 'Montserrat-BoldItalic' } },
    }
    const props: RichTextProps = {
      source: { html: '<p>x</p>' },
      baseStyle: { fontSize: 16 },
      tagStyles: { p: { color: 'red' } },
      classStyles: { note: { color: 'blue' } },
      fonts,
      onLinkPress: (href) => void href,
    }
    const renderer: Renderer = () => null
    expect([props.source.html, typeof renderer, fonts.Montserrat!['700']!.normal]).toEqual([
      '<p>x</p>',
      'function',
      'Montserrat-Bold',
    ])
  })
})

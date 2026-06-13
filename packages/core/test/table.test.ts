import { describe, expect, it } from 'vitest'
import { parse } from '@yk-yong/react-native-richtext-dom'
import { resolveStyles } from '@yk-yong/react-native-richtext-css'
import { splitDocument } from '../src/split'
import { processText } from '../src/text/process-text'
import { annotateMarkers } from '../src/markers'
import type { TableNode } from '../src/types'

const build = (html: string) => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc)
  return annotateMarkers(processText(splitDocument(doc, styles)))
}
const firstTable = (html: string): TableNode => {
  const t = build(html).find((n) => n.type === 'table')
  if (!t || t.type !== 'table') throw new Error('no table found')
  return t
}

describe('buildTable', () => {
  it('builds a TableNode for <table>', () => {
    const t = firstTable('<table><tr><td>a</td><td>b</td></tr></table>')
    expect(t.type).toBe('table')
    expect(t.columnCount).toBe(2)
    expect(t.rows).toHaveLength(1)
    expect(t.rows[0]!.items).toHaveLength(2)
  })

  it('orders thead rows before tbody and tfoot', () => {
    const t = firstTable(
      '<table>' +
        '<tfoot><tr><td>f</td></tr></tfoot>' +
        '<tbody><tr><td>b</td></tr></tbody>' +
        '<thead><tr><td>h</td></tr></thead>' +
        '</table>',
    )
    const cellText = (rowIdx: number): string => {
      const item = t.rows[rowIdx]!.items[0]!
      return item.type === 'table-cell' ? JSON.stringify(item.children) : ''
    }
    expect(t.rows[0]!.isHeader).toBe(true)
    expect(cellText(0)).toContain('h')
    expect(cellText(1)).toContain('b')
    expect(cellText(2)).toContain('f')
  })

  it('ignores whitespace between rows and cells', () => {
    const t = firstTable('<table>\n  <tr>\n    <td>a</td>\n    <td>b</td>\n  </tr>\n</table>')
    expect(t.rows).toHaveLength(1)
    expect(t.rows[0]!.items).toHaveLength(2)
  })

  it('reads colspan as the cell weight', () => {
    const t = firstTable(
      '<table><tr><td colspan="2">a</td></tr><tr><td>b</td><td>c</td></tr></table>',
    )
    expect(t.columnCount).toBe(2)
    const c = t.rows[0]!.items[0]!
    expect(c.type === 'table-cell' && c.colSpan).toBe(2)
  })

  it('models rowspan with a filler in the next row', () => {
    const t = firstTable(
      '<table><tr><td rowspan="2">a</td><td>b</td></tr><tr><td>c</td></tr></table>',
    )
    expect(t.columnCount).toBe(2)
    expect(t.rows[1]!.items[0]!.type).toBe('table-filler')
    expect(t.rows[1]!.items[1]!.type).toBe('table-cell')
  })

  it('extracts a caption', () => {
    const t = firstTable('<table><caption>Cap</caption><tr><td>a</td></tr></table>')
    expect(JSON.stringify(t.caption)).toContain('Cap')
  })

  it('marks th cells as headers', () => {
    const t = firstTable('<table><tr><th>H</th></tr></table>')
    const c = t.rows[0]!.items[0]!
    expect(c.type === 'table-cell' && c.tag).toBe('th')
    expect(c.type === 'table-cell' && c.isHeader).toBe(true)
  })

  it('supports a nested table inside a cell', () => {
    const t = firstTable('<table><tr><td><table><tr><td>inner</td></tr></table></td></tr></table>')
    const c = t.rows[0]!.items[0]!
    expect(c.type === 'table-cell' && JSON.stringify(c.children)).toContain('"type":"table"')
  })

  it('collapses whitespace inside a cell', () => {
    const t = firstTable('<table><tr><td>  a   b  </td></tr></table>')
    const c = t.rows[0]!.items[0]!
    const json = c.type === 'table-cell' ? JSON.stringify(c.children) : ''
    expect(json).toContain('a b')
    expect(json).not.toContain('a   b')
  })

  it('annotates list markers inside a cell', () => {
    const t = firstTable('<table><tr><td><ul><li>x</li></ul></td></tr></table>')
    expect(JSON.stringify(t)).toContain('•')
  })
})

import { describe, expect, it } from 'vitest'
import { parse } from '@yk-yong/rn-rich-text-dom'
import { resolveStyles } from '@yk-yong/rn-rich-text-css'
import { splitDocument } from '../src/split'
import { processText } from '../src/text/process-text'
import { annotateMarkers } from '../src/markers'
import type { BlockNode } from '../src/types'

const run = (html: string) => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc)
  return annotateMarkers(processText(splitDocument(doc, styles)))
}

const lis = (tree: ReturnType<typeof run>, listIndex = 0): BlockNode[] => {
  const list = tree[listIndex] as BlockNode
  return list.children.filter((c): c is BlockNode => c.type === 'block' && c.tag === 'li')
}

describe('annotateMarkers', () => {
  it('numbers unordered list items with disc bullets', () => {
    const items = lis(run('<ul><li>a</li><li>b</li></ul>'))
    expect(items.map((li) => li.marker)).toEqual([
      { ordered: false, index: 1, listStyleType: 'disc', text: '•' },
      { ordered: false, index: 2, listStyleType: 'disc', text: '•' },
    ])
  })

  it('numbers ordered list items with decimals', () => {
    const items = lis(run('<ol><li>a</li><li>b</li><li>c</li></ol>'))
    expect(items.map((li) => li.marker?.text)).toEqual(['1.', '2.', '3.'])
    expect(items[0]!.marker?.ordered).toBe(true)
  })

  it('restarts counting per list', () => {
    const tree = run('<ol><li>a</li></ol><ol><li>b</li></ol>')
    expect(lis(tree, 0)[0]!.marker?.index).toBe(1)
    expect(lis(tree, 1)[0]!.marker?.index).toBe(1)
  })
})

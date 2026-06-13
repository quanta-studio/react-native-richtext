import { mapTypeAttr, orderedMarker } from './list-style'
import type { BlockChild } from './types'

const BULLET: Record<string, string> = {
  disc: '•',
  circle: '◦',
  square: '▪',
  none: '',
}

function parseInt10(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : undefined
}

function markerText(ordered: boolean, index: number, listStyleType: string): string {
  if (ordered) return orderedMarker(index, listStyleType)
  return BULLET[listStyleType] ?? '•'
}

/** Annotate each <li> in the tree with its list marker. Mutates in place; returns the tree. */
export function annotateMarkers(nodes: BlockChild[]): BlockChild[] {
  for (const node of nodes) {
    if (node.type === 'table') {
      if (node.caption) annotateMarkers(node.caption)
      for (const row of node.rows) {
        for (const item of row.items) {
          if (item.type === 'table-cell') annotateMarkers(item.children)
        }
      }
      continue
    }
    if (node.type !== 'block') continue
    if (node.tag === 'ul' || node.tag === 'ol') {
      const ordered = node.tag === 'ol'
      const typeStyle = ordered ? mapTypeAttr(node.attribs.type) : undefined
      let next = ordered ? (parseInt10(node.attribs.start) ?? 1) : 1
      for (const child of node.children) {
        if (child.type === 'block' && child.tag === 'li') {
          const valueOverride = ordered ? parseInt10(child.attribs.value) : undefined
          const index = valueOverride ?? next
          const listStyleType = ordered
            ? (typeStyle ?? child.control.listStyleType ?? 'decimal')
            : (child.control.listStyleType ?? 'disc')
          child.marker = {
            ordered,
            index,
            listStyleType,
            text: markerText(ordered, index, listStyleType),
          }
          next = index + 1
        }
      }
    }
    annotateMarkers(node.children)
  }
  return nodes
}

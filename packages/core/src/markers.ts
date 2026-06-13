import type { BlockChild, BlockNode } from './types'

const BULLET: Record<string, string> = {
  disc: '•',
  circle: '◦',
  square: '▪',
  none: '',
}

function markerText(ordered: boolean, index: number, listStyleType: string): string {
  if (ordered) return `${index}.` // decimal; lower-alpha/roman fall back to decimal in v1
  return BULLET[listStyleType] ?? '•'
}

/** Annotate each <li> in the tree with its list marker. Mutates in place; returns the tree. */
export function annotateMarkers(nodes: BlockChild[]): BlockChild[] {
  for (const node of nodes) {
    if (node.type !== 'block') continue
    if (node.tag === 'ul' || node.tag === 'ol') {
      const ordered = node.tag === 'ol'
      let index = 0
      for (const child of node.children) {
        if (child.type === 'block' && child.tag === 'li') {
          index += 1
          const listStyleType = child.control.listStyleType ?? (ordered ? 'decimal' : 'disc')
          child.marker = { ordered, index, listStyleType, text: markerText(ordered, index, listStyleType) }
        }
      }
    }
    annotateMarkers(node.children)
  }
  return nodes
}

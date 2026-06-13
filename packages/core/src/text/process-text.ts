import { decodeText } from './decode'
import { collapseLeaves } from './collapse'
import type {
  BlockChild,
  InlineChild,
  InlineContainerNode,
  LineBreakNode,
  TextNode,
} from '../types'

type Leaf = TextNode | LineBreakNode

function collectLeaves(children: InlineChild[], out: Leaf[]): void {
  for (const child of children) {
    if (child.type === 'text' || child.type === 'linebreak') out.push(child)
    else collectLeaves(child.children, out)
  }
}

/** Remove empty TextNodes from an inline subtree (in place). */
function pruneEmptyText(children: InlineChild[]): InlineChild[] {
  const result: InlineChild[] = []
  for (const child of children) {
    if (child.type === 'text') {
      if (child.text.length > 0) result.push(child)
    } else if (child.type === 'linebreak') {
      result.push(child)
    } else {
      child.children = pruneEmptyText(child.children)
      result.push(child)
    }
  }
  return result
}

/** True if an inline subtree has any rendered content (a linebreak or non-empty text). */
function hasContent(children: InlineChild[]): boolean {
  for (const child of children) {
    if (child.type === 'linebreak') return true
    if (child.type === 'text') {
      if (child.text.length > 0) return true
    } else if (hasContent(child.children)) {
      return true
    }
  }
  return false
}

function processContainer(node: InlineContainerNode): InlineContainerNode | null {
  const leaves: Leaf[] = []
  collectLeaves(node.children, leaves)
  for (const leaf of leaves) {
    if (leaf.type === 'text') leaf.text = decodeText(leaf.text)
  }
  collapseLeaves(leaves, node.whiteSpace)
  node.children = pruneEmptyText(node.children)
  return hasContent(node.children) ? node : null
}

/** Decode + collapse every inline-container in the tree; drop empty containers. */
export function processText(nodes: BlockChild[]): BlockChild[] {
  const result: BlockChild[] = []
  for (const node of nodes) {
    if (node.type === 'block') {
      node.children = processText(node.children)
      result.push(node)
    } else {
      const processed = processContainer(node)
      if (processed) result.push(processed)
    }
  }
  return result
}

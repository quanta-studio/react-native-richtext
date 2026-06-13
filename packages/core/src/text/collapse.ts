import type { LineBreakNode, TextNode, WhiteSpace } from '../types'

type Leaf = TextNode | LineBreakNode

const COLLAPSIBLE = /[ \t\r\n\f]+/g // note: U+00A0 (nbsp) is intentionally excluded
const SPACES_TABS = /[ \t\f]+/g

/** Collapse whitespace across a container's flat leaf sequence, by white-space mode. Mutates in place. */
export function collapseLeaves(leaves: Leaf[], whiteSpace: WhiteSpace): void {
  if (whiteSpace === 'pre' || whiteSpace === 'pre-wrap') return // preserve everything

  if (whiteSpace === 'pre-line') {
    for (const leaf of leaves) {
      if (leaf.type === 'text') leaf.text = leaf.text.replace(SPACES_TABS, ' ')
    }
    return
  }

  // 'normal' | 'nowrap': collapse runs, dedupe boundaries, trim edges.
  for (const leaf of leaves) {
    if (leaf.type === 'text') leaf.text = leaf.text.replace(COLLAPSIBLE, ' ')
  }

  let prevEndedWithSpace = true // container start => trim leading
  for (const leaf of leaves) {
    if (leaf.type === 'linebreak') {
      prevEndedWithSpace = true
      continue
    }
    let text = leaf.text
    if (prevEndedWithSpace && text.startsWith(' ')) text = text.slice(1)
    leaf.text = text
    if (text.length > 0) prevEndedWithSpace = text.endsWith(' ')
  }

  // Trim trailing space on the last non-empty text leaf (stop at a trailing linebreak).
  for (let i = leaves.length - 1; i >= 0; i--) {
    const leaf = leaves[i]!
    if (leaf.type === 'linebreak') break
    if (leaf.text.endsWith(' ')) leaf.text = leaf.text.slice(0, -1)
    if (leaf.text.length > 0) break
  }
}

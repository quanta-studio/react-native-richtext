import { isTag, isText } from '@yk-yong/rn-rich-text-dom'
import type { AnyNode, Document, Element } from '@yk-yong/rn-rich-text-dom'
import type { ComputedStyle } from '@yk-yong/rn-rich-text-css'
import { displayOf, isBlockLevel, isHidden, isNonRendered } from './classify'
import type {
  BlockChild,
  BlockNode,
  ControlStyle,
  InlineChild,
  InlineNode,
  LineBreakNode,
  RNStyle,
  WhiteSpace,
} from './types'

const EMPTY_STYLE: RNStyle = {}
const DEFAULT_CONTROL: ControlStyle = { display: 'inline', whiteSpace: 'normal' }

type Styles = Map<Element, ComputedStyle>

const childKey = (prefix: string, i: number): string => (prefix === '' ? `${i}` : `${prefix}.${i}`)

/** Build the render tree from a document treated as a block context. */
export function splitDocument(document: Document, styles: Styles): BlockChild[] {
  return buildBlockContext(document.children as AnyNode[], EMPTY_STYLE, 'normal', '', styles)
}

function buildBlockContext(
  nodes: AnyNode[],
  ownerStyle: RNStyle,
  ownerWhiteSpace: WhiteSpace,
  keyPrefix: string,
  styles: Styles,
): BlockChild[] {
  const result: BlockChild[] = []
  let run: InlineChild[] = []
  let runKey = ''

  const flush = () => {
    if (run.length > 0) {
      result.push({
        type: 'inline-container',
        style: ownerStyle,
        whiteSpace: ownerWhiteSpace,
        children: run,
        key: runKey,
      })
      run = []
    }
  }

  nodes.forEach((node, i) => {
    const key = childKey(keyPrefix, i)
    if (isText(node)) {
      if (run.length === 0) runKey = key
      run.push({ type: 'text', text: node.data, key })
      return
    }
    if (!isTag(node)) return // comments, directives, cdata
    if (isNonRendered(node.name) || isHidden(node, styles)) return
    if (isBlockLevel(displayOf(node, styles))) {
      flush()
      result.push(buildBlock(node, key, styles))
    } else {
      if (run.length === 0) runKey = key
      run.push(buildInline(node, key, styles))
    }
  })
  flush()
  return result
}

function buildBlock(el: Element, key: string, styles: Styles): BlockNode {
  const cs = styles.get(el)
  const style = cs?.style ?? EMPTY_STYLE
  const control = cs?.control ?? DEFAULT_CONTROL
  const children = buildBlockContext(el.children as AnyNode[], style, control.whiteSpace, key, styles)
  return { type: 'block', tag: el.name, style, control, attribs: el.attribs, children, key }
}

function buildInline(el: Element, key: string, styles: Styles): InlineNode | LineBreakNode {
  if (el.name === 'br') return { type: 'linebreak', key }
  const cs = styles.get(el)
  const style = cs?.style ?? EMPTY_STYLE
  const control = cs?.control ?? DEFAULT_CONTROL
  const children = buildInlineChildren(el.children as AnyNode[], key, styles)
  return { type: 'inline', tag: el.name, style, control, attribs: el.attribs, children, key }
}

function buildInlineChildren(nodes: AnyNode[], keyPrefix: string, styles: Styles): InlineChild[] {
  const result: InlineChild[] = []
  nodes.forEach((node, i) => {
    const key = childKey(keyPrefix, i)
    if (isText(node)) {
      result.push({ type: 'text', text: node.data, key })
      return
    }
    if (!isTag(node)) return
    if (isNonRendered(node.name) || isHidden(node, styles)) return
    result.push(buildInline(node, key, styles))
  })
  return result
}

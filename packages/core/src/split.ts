import { isTag, isText } from '@yk-yong/react-native-richtext-dom'
import type { AnyNode, Document, Element } from '@yk-yong/react-native-richtext-dom'
import type { ComputedStyle } from '@yk-yong/react-native-richtext-css'
import { displayOf, isBlockLevel, isHidden, isNonRendered } from './classify'
import type {
  BlockChild,
  BlockNode,
  ControlStyle,
  InlineChild,
  InlineNode,
  LineBreakNode,
  RNStyle,
  TableCellNode,
  TableNode,
  WhiteSpace,
} from './types'
import { normalizeGrid, type RawRow } from './table-grid'

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
      result.push(buildBlockLevel(node, key, styles))
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
  const children = buildBlockContext(
    el.children as AnyNode[],
    style,
    control.whiteSpace,
    key,
    styles,
  )
  return { type: 'block', tag: el.name, style, control, attribs: el.attribs, children, key }
}

function buildBlockLevel(el: Element, key: string, styles: Styles): BlockNode | TableNode {
  if (displayOf(el, styles) === 'table') return buildTable(el, key, styles)
  return buildBlock(el, key, styles)
}

function clampSpan(value: string | undefined): number {
  if (value === undefined) return 1
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

function parseColWidth(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const t = value.trim()
  if (t === '' || t.endsWith('%')) return undefined
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function collectColWidths(el: Element): (number | undefined)[] | undefined {
  const widths: (number | undefined)[] = []
  const handleCol = (col: Element): void => {
    const w = parseColWidth(col.attribs.width)
    const span = clampSpan(col.attribs.span)
    for (let i = 0; i < span; i++) widths.push(w)
  }
  for (const child of el.children as AnyNode[]) {
    if (!isTag(child)) continue
    if (child.name === 'colgroup') {
      for (const c of child.children as AnyNode[]) {
        if (isTag(c) && c.name === 'col') handleCol(c)
      }
    } else if (child.name === 'col') {
      handleCol(child)
    }
  }
  return widths.length > 0 ? widths : undefined
}

function buildCell(el: Element, key: string, styles: Styles): TableCellNode {
  const cs = styles.get(el)
  const style = cs?.style ?? EMPTY_STYLE
  const control = cs?.control ?? DEFAULT_CONTROL
  const isHeader = el.name === 'th'
  const children = buildBlockContext(
    el.children as AnyNode[],
    style,
    control.whiteSpace,
    key,
    styles,
  )
  return {
    type: 'table-cell',
    tag: isHeader ? 'th' : 'td',
    isHeader,
    colSpan: clampSpan(el.attribs.colspan),
    rowSpan: clampSpan(el.attribs.rowspan),
    style,
    control,
    attribs: el.attribs,
    children,
    key,
  }
}

function buildRow(tr: Element, key: string, styles: Styles, isHeader: boolean): RawRow {
  const cs = styles.get(tr)
  const cells: TableCellNode[] = []
  ;(tr.children as AnyNode[]).forEach((child, i) => {
    if (isTag(child) && (child.name === 'td' || child.name === 'th')) {
      cells.push(buildCell(child, childKey(key, i), styles))
    }
  })
  return { isHeader, style: cs?.style ?? EMPTY_STYLE, attribs: tr.attribs, cells, key }
}

function collectSectionRows(
  section: Element,
  key: string,
  styles: Styles,
  isHeader: boolean,
  out: RawRow[],
): void {
  ;(section.children as AnyNode[]).forEach((child, i) => {
    if (isTag(child) && child.name === 'tr') {
      out.push(buildRow(child, childKey(key, i), styles, isHeader))
    }
  })
}

function buildTable(el: Element, key: string, styles: Styles): TableNode {
  const cs = styles.get(el)
  const style = cs?.style ?? EMPTY_STYLE
  const control = cs?.control ?? DEFAULT_CONTROL

  let caption: BlockChild[] | undefined
  const headRows: RawRow[] = []
  const bodyRows: RawRow[] = []
  const footRows: RawRow[] = []

  ;(el.children as AnyNode[]).forEach((child, i) => {
    if (!isTag(child)) return
    const childK = childKey(key, i)
    switch (child.name) {
      case 'caption': {
        if (caption === undefined) {
          const ccs = styles.get(child)
          caption = buildBlockContext(
            child.children as AnyNode[],
            ccs?.style ?? EMPTY_STYLE,
            ccs?.control.whiteSpace ?? 'normal',
            childK,
            styles,
          )
        }
        return
      }
      case 'thead':
        collectSectionRows(child, childK, styles, true, headRows)
        return
      case 'tbody':
        collectSectionRows(child, childK, styles, false, bodyRows)
        return
      case 'tfoot':
        collectSectionRows(child, childK, styles, false, footRows)
        return
      case 'tr':
        bodyRows.push(buildRow(child, childK, styles, false))
        return
      default:
        return // colgroup/col handled by collectColWidths; other elements ignored
    }
  })

  const { rows, columnCount } = normalizeGrid([...headRows, ...bodyRows, ...footRows])
  return {
    type: 'table',
    tag: 'table',
    style,
    control,
    attribs: el.attribs,
    caption,
    columnCount,
    colWidths: collectColWidths(el),
    rows,
    key,
  }
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

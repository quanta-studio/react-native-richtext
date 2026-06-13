import { describe, expect, it } from 'vitest'
import { create, act } from 'react-test-renderer'
import { View, ScrollView } from 'react-native'
import { TableCell } from '../src/renderers/TableCell'
import { TableRow } from '../src/renderers/TableRow'
import type { TableCellNode, TableRowNode } from '@yk-yong/react-native-richtext-core'
import { Table } from '../src/renderers/Table'
import { defaultRenderers } from '../src/renderers/defaults'
import { RichTextContext } from '../src/context'
import type { Renderer } from '../src/types'
import type { TableNode } from '@yk-yong/react-native-richtext-core'

const cellNode = (colSpan = 1): TableCellNode => ({
  type: 'table-cell',
  tag: 'td',
  isHeader: false,
  colSpan,
  rowSpan: 1,
  style: {},
  control: { display: 'table-cell', whiteSpace: 'normal' },
  attribs: {},
  children: [],
  key: 'c',
})

describe('TableCell', () => {
  it('renders the cell box style on a View (width comes from the node)', () => {
    const node = { ...cellNode(1), style: { width: 80, paddingTop: 2 } }
    const tree = create(<TableCell node={node} />)
    expect(tree.root.findByType(View).props.style).toMatchObject({ width: 80, paddingTop: 2 })
  })
})

describe('TableRow', () => {
  it('lays cells out in a row', () => {
    const rowNode: TableRowNode = {
      type: 'table-row',
      isHeader: false,
      style: {},
      attribs: {},
      items: [],
      key: 'r',
    }
    const tree = create(<TableRow node={rowNode} />)
    expect(tree.root.findByType(View).props.style).toContainEqual({
      flexDirection: 'row',
      alignItems: 'stretch',
    })
  })
})

const ctxValue = (registry: Record<string, Renderer> = defaultRenderers) => ({
  registry,
  fonts: undefined,
  onLinkPress: () => {},
})
const wrapTable = (ui: React.ReactNode, registry?: Record<string, Renderer>) =>
  create(<RichTextContext.Provider value={ctxValue(registry)}>{ui}</RichTextContext.Provider>)

const tableNode = (overrides: Partial<TableNode> = {}): TableNode => ({
  type: 'table',
  tag: 'table',
  key: 'tbl',
  style: {},
  control: { display: 'table', whiteSpace: 'normal' },
  attribs: {},
  columnCount: 2,
  rows: [
    {
      type: 'table-row',
      isHeader: false,
      style: {},
      attribs: {},
      key: 'r0',
      items: [
        {
          type: 'table-cell',
          tag: 'td',
          isHeader: false,
          colSpan: 1,
          rowSpan: 1,
          style: {},
          control: { display: 'table-cell', whiteSpace: 'normal' },
          attribs: {},
          children: [],
          key: 'r0.0',
        },
        { type: 'table-filler', key: 'r0:f1' },
      ],
    },
  ],
  ...overrides,
})

const twoColTable = (overrides: Partial<TableNode> = {}): TableNode => ({
  type: 'table',
  tag: 'table',
  style: {},
  control: { display: 'table', whiteSpace: 'normal' },
  attribs: {},
  columnCount: 2,
  key: 't2',
  rows: [
    {
      type: 'table-row',
      isHeader: false,
      style: {},
      attribs: {},
      key: 'r0',
      items: [
        { type: 'table-cell', tag: 'td', isHeader: false, colSpan: 1, rowSpan: 1, style: {}, control: { display: 'table-cell', whiteSpace: 'normal' }, attribs: {}, children: [], key: 'r0.0' },
        { type: 'table-cell', tag: 'td', isHeader: false, colSpan: 1, rowSpan: 1, style: {}, control: { display: 'table-cell', whiteSpace: 'normal' }, attribs: {}, children: [], key: 'r0.1' },
      ],
    },
  ],
  ...overrides,
})

const fireLayout = (n: { props: { onLayout?: (e: unknown) => void } }, width: number) =>
  act(() => n.props.onLayout?.({ nativeEvent: { layout: { width, height: 10, x: 0, y: 0 } } }))
const outerView = (tree: ReturnType<typeof create>) => tree.root.findAllByType(View)[0]!
const measureWrappers = (tree: ReturnType<typeof create>) =>
  tree.root.findAll(
    (n) =>
      typeof (n.props as { onLayout?: unknown }).onLayout === 'function' &&
      (n.props as { style?: { flexShrink?: number } }).style?.flexShrink === 0,
  )
const measure = (tree: ReturnType<typeof create>, container: number, cellWidths: number[]) => {
  fireLayout(outerView(tree), container)
  measureWrappers(tree).forEach((w, i) => fireLayout(w, cellWidths[i] ?? 0))
}
const cellWidthsOf = (tree: ReturnType<typeof create>) =>
  tree.root
    .findAllByType(View)
    .map((v) => (v.props.style as { width?: number })?.width)
    .filter((w): w is number => typeof w === 'number')

describe('Table', () => {
  it('renders a caption above the rows', () => {
    const node = tableNode({
      caption: [
        {
          type: 'inline-container',
          style: {},
          whiteSpace: 'normal',
          key: 'cap',
          children: [{ type: 'text', text: 'Cap', key: 'cap.0' }],
        },
      ],
    })
    const tree = wrapTable(<Table node={node} />)
    expect(JSON.stringify(tree.toJSON())).toContain('Cap')
  })

  it('lets a consumer override td via the registry', () => {
    const MyCell: Renderer = ({ children }) => <View testID="custom-cell">{children}</View>
    const tree = wrapTable(<Table node={tableNode()} />, { ...defaultRenderers, td: MyCell })
    const custom = tree.root.findAllByType(View).find((v) => v.props.testID === 'custom-cell')
    expect(custom).toBeDefined()
  })
})

describe('Table (measured)', () => {
  it('expands columns proportionally to fill when the table fits', () => {
    const tree = wrapTable(<Table node={tableNode()} />) // 1 real cell + 1 filler, columnCount 2
    measure(tree, 300, [100])
    expect(cellWidthsOf(tree)).toContain(300) // the single measured column fills the container
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(0)
  })

  it('keeps natural widths inside a horizontal ScrollView when it overflows', () => {
    const tree = wrapTable(<Table node={twoColTable()} />)
    measure(tree, 150, [200, 200]) // total 400 > 150 -> overflow
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(1)
    expect(tree.root.findAllByType(ScrollView)[0]!.props.horizontal).toBe(true)
  })

  it('applies the legacy border attribute as collapse-style cell borders', () => {
    const tree = wrapTable(<Table node={tableNode({ attribs: { border: '1' } })} />)
    measure(tree, 300, [100])
    const bordered = tree.root
      .findAllByType(View)
      .some((v) => (v.props.style as { borderTopWidth?: number })?.borderTopWidth === 1)
    expect(bordered).toBe(true)
  })

  it('skips measurement when every column has an explicit <col> width', () => {
    const tree = wrapTable(<Table node={twoColTable({ colWidths: [80, 120] })} />)
    expect(measureWrappers(tree)).toHaveLength(0) // widths known immediately, no measure pass
    expect(cellWidthsOf(tree)).toEqual(expect.arrayContaining([80, 120]))
  })
})

describe('defaultRenderers (table)', () => {
  it('registers the table renderers', () => {
    expect(defaultRenderers.table).toBe(Table)
    expect(defaultRenderers.td).toBe(TableCell)
    expect(defaultRenderers.th).toBe(TableCell)
    expect(defaultRenderers.tr).toBe(TableRow)
  })
})

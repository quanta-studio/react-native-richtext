import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View } from 'react-native'
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
  it('applies flexGrow equal to colSpan', () => {
    const tree = create(<TableCell node={cellNode(2)} />)
    expect(tree.root.findByType(View).props.style).toContainEqual({
      flexGrow: 2,
      flexBasis: 0,
      flexShrink: 1,
    })
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

describe('Table', () => {
  it('renders a filler View for filler slots', () => {
    const tree = wrapTable(<Table node={tableNode()} />)
    const fillers = tree.root.findAllByType(View).filter((v) => {
      const s = v.props.style as Record<string, unknown> | undefined
      return s != null && s.flexGrow === 1 && s.flexBasis === 0 && !('flexShrink' in s)
    })
    expect(fillers).toHaveLength(1)
  })

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

  it('applies the legacy border attribute as collapse-style cell borders', () => {
    const tree = wrapTable(<Table node={tableNode({ attribs: { border: '1' } })} />)
    const bordered = tree.root.findAllByType(View).find((v) => {
      const s = v.props.style as unknown[] | undefined
      return Array.isArray(s) && s.some((x) => (x as Record<string, unknown>)?.borderTopWidth === 1)
    })
    expect(bordered).toBeDefined()
  })

  it('lets a consumer override td via the registry', () => {
    const MyCell: Renderer = ({ children }) => <View testID="custom-cell">{children}</View>
    const tree = wrapTable(<Table node={tableNode()} />, { ...defaultRenderers, td: MyCell })
    const custom = tree.root.findAllByType(View).find((v) => v.props.testID === 'custom-cell')
    expect(custom).toBeDefined()
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

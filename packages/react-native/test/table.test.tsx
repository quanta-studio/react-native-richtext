import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View } from 'react-native'
import { TableCell } from '../src/renderers/TableCell'
import { TableRow } from '../src/renderers/TableRow'
import type { TableCellNode, TableRowNode } from '@yk-yong/react-native-richtext-core'

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

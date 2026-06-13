import type { RNStyle, ControlStyle } from '@yk-yong/react-native-richtext-css'

export type { RNStyle, ControlStyle }
export type WhiteSpace = ControlStyle['whiteSpace']

export interface ListMarker {
  ordered: boolean
  index: number
  listStyleType: string
  text: string
}

export interface BlockNode {
  type: 'block'
  tag: string
  style: RNStyle
  control: ControlStyle
  attribs: Record<string, string>
  marker?: ListMarker
  children: BlockChild[]
  key: string
}

export interface TableNode {
  type: 'table'
  tag: 'table'
  style: RNStyle
  control: ControlStyle
  attribs: Record<string, string>
  caption?: BlockChild[]
  columnCount: number
  colWidths?: (number | undefined)[]
  rows: TableRowNode[]
  key: string
}

export interface TableRowNode {
  type: 'table-row'
  isHeader: boolean
  style: RNStyle
  attribs: Record<string, string>
  items: RowItem[]
  key: string
}

export interface TableCellNode {
  type: 'table-cell'
  tag: 'td' | 'th'
  isHeader: boolean
  colSpan: number
  rowSpan: number
  style: RNStyle
  control: ControlStyle
  attribs: Record<string, string>
  children: BlockChild[]
  key: string
}

export interface FillerSlot {
  type: 'table-filler'
  key: string
}

export type RowItem = TableCellNode | FillerSlot

export interface InlineContainerNode {
  type: 'inline-container'
  style: RNStyle
  whiteSpace: WhiteSpace
  children: InlineChild[]
  key: string
}

export interface InlineNode {
  type: 'inline'
  tag: string
  style: RNStyle
  control: ControlStyle
  attribs: Record<string, string>
  children: InlineChild[]
  key: string
}

export interface TextNode {
  type: 'text'
  text: string
  key: string
}

export interface LineBreakNode {
  type: 'linebreak'
  key: string
}

export type InlineChild = InlineNode | TextNode | LineBreakNode
export type BlockChild = BlockNode | InlineContainerNode | TableNode
export type RenderNode =
  | BlockNode
  | InlineContainerNode
  | InlineNode
  | TextNode
  | LineBreakNode
  | TableNode
  | TableRowNode
  | TableCellNode
  | FillerSlot

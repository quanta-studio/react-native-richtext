import type { RNStyle, ControlStyle } from '@yk-yong/rn-rich-text-css'

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
  children: Array<BlockNode | InlineContainerNode>
  key: string
}

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
export type BlockChild = BlockNode | InlineContainerNode
export type RenderNode = BlockNode | InlineContainerNode | InlineNode | TextNode | LineBreakNode

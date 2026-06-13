import type { ReactNode, ComponentType } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import type { RenderNode, RNStyle } from '@yk-yong/react-native-richtext-core'

export type { RenderNode, RNStyle }

export interface RendererProps {
  node: RenderNode
  children?: ReactNode
}

export type Renderer = ComponentType<RendererProps>

export type FontFaces = { normal?: string; italic?: string }
export type FontMap = Record<string, Record<string, FontFaces>>

export interface RichTextProps {
  source: { html: string }
  baseStyle?: RNStyle
  tagStyles?: Record<string, RNStyle>
  classStyles?: Record<string, RNStyle>
  renderers?: Record<string, Renderer>
  fonts?: FontMap
  onLinkPress?: (href: string) => void
  style?: StyleProp<ViewStyle>
}

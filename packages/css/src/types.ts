import type { Element, Document } from '@yk-yong/react-native-richtext-dom'

export type { Element, Document }

/** Curated, hand-authored subset of RN TextStyle & ViewStyle. The whitelist IS the type. */
export interface RNStyle {
  color?: string
  fontFamily?: string
  fontSize?: number
  fontStyle?: 'normal' | 'italic'
  fontWeight?:
    | 'normal'
    | 'bold'
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900'
  fontVariant?: string[]
  lineHeight?: number
  letterSpacing?: number
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify'
  textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through'
  textDecorationColor?: string
  textDecorationStyle?: 'solid' | 'double' | 'dotted' | 'dashed'
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  backgroundColor?: string
  opacity?: number
  margin?: number | string
  marginTop?: number | string
  marginRight?: number | string
  marginBottom?: number | string
  marginLeft?: number | string
  padding?: number | string
  paddingTop?: number | string
  paddingRight?: number | string
  paddingBottom?: number | string
  paddingLeft?: number | string
  width?: number | string
  height?: number | string
  minWidth?: number | string
  maxWidth?: number | string
  minHeight?: number | string
  maxHeight?: number | string
  borderColor?: string
  borderTopColor?: string
  borderRightColor?: string
  borderBottomColor?: string
  borderLeftColor?: string
  borderWidth?: number
  borderTopWidth?: number
  borderRightWidth?: number
  borderBottomWidth?: number
  borderLeftWidth?: number
  borderRadius?: number
  borderStyle?: 'solid' | 'dotted' | 'dashed'
  gap?: number
  aspectRatio?: number
}

export type RNStyleProp = keyof RNStyle

/** CSS-computed props the renderer needs that are not RN style keys. */
export interface ControlStyle {
  display: 'block' | 'inline' | 'inline-block' | 'list-item' | 'none'
  whiteSpace: 'normal' | 'pre' | 'pre-wrap' | 'pre-line' | 'nowrap'
  listStyleType?: string
  listStylePosition?: 'inside' | 'outside'
}

export type ControlProp = keyof ControlStyle
export type TargetProp = RNStyleProp | ControlProp

export interface ComputedStyle {
  style: RNStyle
  control: ControlStyle
}

/** Cascade tiers, low -> high precedence. */
export type Tier = 0 | 1 | 2 | 3 | 4 | 5 // UA, baseStyle, tagStyles, classStyles, <style>, inline
export const Tier = {
  UA: 0,
  Base: 1,
  Tag: 2,
  Class: 3,
  Style: 4,
  Inline: 5,
} as const

export type Specificity = readonly [number, number, number]

export interface DeferredLength {
  readonly kind: 'deferred-length'
  readonly unit: 'em' | 'rem' | '%' | 'unitless'
  readonly number: number
  readonly prop: RNStyleProp
}

export type ResolvedValue = number | string | string[]
export type DeclValue = ResolvedValue | DeferredLength

export interface RNDecl {
  readonly prop: TargetProp
  readonly value: DeclValue
  readonly important: boolean
}

export type MatchTarget =
  | { kind: 'selector'; selector: string }
  | { kind: 'tag'; tag: string }
  | { kind: 'class'; className: string }
  | { kind: 'element'; element: Element }

export interface Rule {
  readonly origin: Tier
  readonly match: MatchTarget
  readonly specificity: Specificity
  readonly order: number
  readonly declarations: readonly RNDecl[]
}

export type DiagnosticReason =
  | 'unknown-property'
  | 'unsupported-value'
  | 'unsupported-unit'
  | 'parse-error'

export interface Diagnostic {
  readonly property: string
  readonly value: string
  readonly reason: DiagnosticReason
  readonly selector?: string
  readonly tier: Tier
}

export interface ResolveOptions {
  baseStyle?: RNStyle
  tagStyles?: Record<string, RNStyle>
  classStyles?: Record<string, RNStyle>
  rootFontSize?: number
  collectDiagnostics?: boolean
}

export interface ResolveResult {
  styles: Map<Element, ComputedStyle>
  diagnostics: Diagnostic[]
}

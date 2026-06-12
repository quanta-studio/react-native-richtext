/**
 * Whitelist of supported CSS properties (camelCase), curated to the v1 tag set.
 * `style` props become RNStyle; `control` props become ComputedStyle.control.
 * Shorthands (margin/padding/border/font/etc.) are listed and expanded downstream.
 */
const STYLE_PROPS = new Set<string>([
  // text
  'color', 'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'fontVariant',
  'lineHeight', 'letterSpacing', 'textAlign', 'textTransform',
  'textDecoration', 'textDecorationLine', 'textDecorationColor', 'textDecorationStyle',
  'font',
  // box
  'backgroundColor', 'background', 'opacity',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  // border
  'border', 'borderColor', 'borderWidth', 'borderStyle', 'borderRadius',
  'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  // fabric-widened
  'gap', 'aspectRatio',
])

const CONTROL_PROPS = new Set<string>([
  'display', 'whiteSpace', 'listStyleType', 'listStylePosition', 'listStyle',
])

export type PropKind = 'style' | 'control' | 'unsupported'

/** Classify a camelCased CSS property. */
export function classifyProp(camelProp: string): PropKind {
  if (CONTROL_PROPS.has(camelProp)) return 'control'
  if (STYLE_PROPS.has(camelProp)) return 'style'
  return 'unsupported'
}

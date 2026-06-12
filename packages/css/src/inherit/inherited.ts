import type { TargetProp } from '../types'

/** CSS-inherited properties relevant to RN/v1 (style + control). */
export const INHERITED: ReadonlySet<TargetProp> = new Set<TargetProp>([
  'color',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'fontVariant',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textTransform',
  'whiteSpace',
  'listStyleType',
  'listStylePosition',
])

export function isInherited(prop: string): boolean {
  return INHERITED.has(prop as TargetProp)
}

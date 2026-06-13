import type { FontMap } from '../types'

function firstFamily(fontFamily: string): string {
  const first = fontFamily.split(',')[0] ?? fontFamily
  return first.trim().replace(/^['"]|['"]$/g, '')
}

function normalizeWeight(weight: string | undefined): string {
  if (weight === undefined || weight === 'normal') return '400'
  if (weight === 'bold') return '700'
  return weight
}

/** Resolve (family, weight, style) to a concrete font face, dropping weight/style on a hit. */
export function resolveFont(
  style: Record<string, unknown>,
  fonts: FontMap | undefined,
): Record<string, unknown> {
  const family = typeof style.fontFamily === 'string' ? style.fontFamily : undefined
  if (!fonts || !family) return style

  const weight = normalizeWeight(style.fontWeight as string | undefined)
  const styleKey = style.fontStyle === 'italic' ? 'italic' : 'normal'
  const face = fonts[firstFamily(family)]?.[weight]?.[styleKey]
  if (!face) return style

  const rest = { ...style }
  delete rest.fontWeight
  delete rest.fontStyle
  return { ...rest, fontFamily: face }
}

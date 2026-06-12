import type { DeclValue, DeferredLength, RNStyleProp } from '../types'

const BOX_SHORTHANDS: Record<string, [RNStyleProp, RNStyleProp, RNStyleProp, RNStyleProp]> = {
  margin: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'],
  padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
}

/** Expand the 1-4 value box model into [top, right, bottom, left]. */
function boxOrder<T>(tokens: T[]): [T, T, T, T] {
  const [a, b = a, c = a, d = b] = tokens
  return [a!, b!, c!, d!]
}

const RESOLVE_PERCENT_PROPS = new Set<RNStyleProp>(['fontSize', 'lineHeight'])

/** Parse a single length token for a given RN longhand prop into a final value or a DeferredLength. */
function parseToken(prop: RNStyleProp, token: string): DeclValue {
  const t = token.trim()
  const m = /^(-?\d*\.?\d+)(em|rem|%|px|pt)?$/i.exec(t)
  if (!m) return t // leave non-numeric tokens (e.g. keywords) as-is
  const n = Number(m[1])
  const unit = (m[2] ?? '').toLowerCase()
  if (unit === 'em' || unit === 'rem') {
    return { kind: 'deferred-length', unit, number: n, prop } as DeferredLength
  }
  if (unit === '%') {
    if (RESOLVE_PERCENT_PROPS.has(prop)) {
      return { kind: 'deferred-length', unit: '%', number: n, prop } as DeferredLength
    }
    return t // layout %: pass through as RN string
  }
  if (unit === 'pt') return (n * 96) / 72
  if (unit === 'px') return n
  // unitless number: line-height multiplies font-size; everything else is a raw number
  if (prop === 'lineHeight') {
    return { kind: 'deferred-length', unit: 'unitless', number: n, prop } as DeferredLength
  }
  return n
}

/**
 * Fallback expansion for values css-to-react-native cannot parse (relative units).
 * Returns RN longhand declarations whose values may be DeferredLength tokens.
 */
export function expandDeferred(
  camelProp: string,
  value: string,
): Array<{ prop: RNStyleProp; value: DeclValue }> {
  const box = BOX_SHORTHANDS[camelProp]
  if (box) {
    const tokens = boxOrder(value.trim().split(/\s+/))
    return box.map((p, i) => ({ prop: p, value: parseToken(p, tokens[i]!) }))
  }
  const prop = camelProp as RNStyleProp
  return [{ prop, value: parseToken(prop, value) }]
}

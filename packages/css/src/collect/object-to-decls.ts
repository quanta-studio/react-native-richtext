import type { RNDecl, RNStyle, TargetProp } from '../types'

/** Convert a consumer RNStyle object (already RN longhand) into declarations. */
export function objectToDecls(style: RNStyle): RNDecl[] {
  const decls: RNDecl[] = []
  for (const [prop, value] of Object.entries(style)) {
    if (value === undefined) continue
    decls.push({ prop: prop as TargetProp, value: value as RNDecl['value'], important: false })
  }
  return decls
}

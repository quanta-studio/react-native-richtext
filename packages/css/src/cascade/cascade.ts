import { compareSpecificity } from '../specificity/specificity'
import type { DeclValue, Rule, TargetProp } from '../types'

export interface SpecifiedEntry {
  value: DeclValue
  important: boolean
}

interface Candidate extends SpecifiedEntry {
  tier: number
  specificity: readonly [number, number, number]
  order: number
}

/** Returns >0 if a wins over b. */
function wins(a: Candidate, b: Candidate): number {
  if (a.important !== b.important) return a.important ? 1 : -1
  return a.tier - b.tier || compareSpecificity(a.specificity, b.specificity) || a.order - b.order
}

export type SpecifiedStyle = Map<TargetProp, SpecifiedEntry>

/** Reduce one element's matched rules to the winning value per property. */
export function cascade(matched: Rule[]): SpecifiedStyle {
  const best = new Map<TargetProp, Candidate>()
  for (const rule of matched) {
    for (const decl of rule.declarations) {
      const candidate: Candidate = {
        value: decl.value,
        important: decl.important,
        tier: rule.origin,
        specificity: rule.specificity,
        order: rule.order,
      }
      const current = best.get(decl.prop)
      if (!current || wins(candidate, current) > 0) best.set(decl.prop, candidate)
    }
  }
  const out: SpecifiedStyle = new Map()
  for (const [prop, cand] of best) out.set(prop, { value: cand.value, important: cand.important })
  return out
}

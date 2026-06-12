import { parseStylesheet } from '../parse/parse-stylesheet'
import { mapDeclaration } from '../mapping/map-declaration'
import { specificity } from '../specificity/specificity'
import { UA_STYLESHEET } from './ua-stylesheet'
import { Tier } from '../types'
import type { Rule } from '../types'

let cached: Rule[] | undefined

/** Build the UA stylesheet into cascade Rules at the UA tier. Cached after first call. */
export function buildUaRules(): Rule[] {
  if (cached) return cached
  const rules: Rule[] = []
  let order = 0
  for (const raw of parseStylesheet(UA_STYLESHEET)) {
    const declarations = raw.declarations.flatMap((d) => mapDeclaration(d).decls)
    if (declarations.length === 0) continue
    rules.push({
      origin: Tier.UA,
      match: { kind: 'selector', selector: raw.selector },
      specificity: specificity(raw.selector),
      order: order++,
      declarations,
    })
  }
  cached = rules
  return rules
}

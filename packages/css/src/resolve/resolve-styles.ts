import { isTag } from '@quanta-studio/react-native-richtext-dom'
import type { Document, Element } from '@quanta-studio/react-native-richtext-dom'
import { collectRules } from '../collect/collect-rules'
import { matchRules } from '../match/match-rules'
import { cascade } from '../cascade/cascade'
import { computeElement, ROOT_PARENT } from './compute-element'
import type { ComputedStyle, ResolveOptions, ResolveResult } from '../types'

/** Resolve a parsed DOM + consumer styles into a fully-computed RN style per element. */
export function resolveStyles(doc: Document, options: ResolveOptions = {}): ResolveResult {
  const rootFontSize = options.baseStyle?.fontSize ?? options.rootFontSize ?? 16
  const { rules, diagnostics } = collectRules(doc, { ...options, rootFontSize })
  const matched = matchRules(doc, rules)
  const styles = new Map<Element, ComputedStyle>()

  const rootParent: ComputedStyle = {
    style: { ...ROOT_PARENT.style, fontSize: rootFontSize },
    control: { ...ROOT_PARENT.control },
  }

  const walk = (el: Element, parent: ComputedStyle) => {
    const specified = cascade(matched.get(el) ?? [])
    const computed = computeElement(specified, parent, rootFontSize)
    styles.set(el, computed)
    for (const child of el.children) {
      if (isTag(child)) walk(child, computed)
    }
  }

  for (const child of doc.children) {
    if (isTag(child)) walk(child, rootParent)
  }

  return { styles, diagnostics: options.collectDiagnostics ? diagnostics : [] }
}

import {
  getElementsByTagName,
  getText,
  isTag,
  findAll,
} from '@quanta-studio/react-native-richtext-dom'
import type { Document, Element } from '@quanta-studio/react-native-richtext-dom'
import { parseStylesheet } from '../parse/parse-stylesheet'
import { parseInline } from '../parse/parse-inline'
import { mapDeclaration } from '../mapping/map-declaration'
import { specificity } from '../specificity/specificity'
import { objectToDecls } from './object-to-decls'
import { buildUaRules } from '../ua/ua-rules'
import { Tier } from '../types'
import type { Diagnostic, RNDecl, ResolveOptions, Rule, Tier as TierT } from '../types'

function mapInto(
  raw: { property: string; value: string; important: boolean }[],
  tier: TierT,
  selector: string | undefined,
  diagnostics: Diagnostic[],
): RNDecl[] {
  const decls: RNDecl[] = []
  for (const d of raw) {
    const res = mapDeclaration(d)
    decls.push(...res.decls)
    for (const diag of res.diagnostics) diagnostics.push({ ...diag, tier, selector })
  }
  return decls
}

/** Find top-level element children of the document (the roots baseStyle applies to). */
function topLevelElements(doc: Document): Element[] {
  return doc.children.filter((n): n is Element => isTag(n))
}

/** Assemble cascade rules from every tier plus diagnostics. */
export function collectRules(
  doc: Document,
  options: ResolveOptions,
): { rules: Rule[]; diagnostics: Diagnostic[] } {
  const rules: Rule[] = [...buildUaRules()]
  const diagnostics: Diagnostic[] = []
  let order = 1000

  // Tier 1: baseStyle — bound to each top-level element.
  if (options.baseStyle) {
    const decls = objectToDecls(options.baseStyle)
    for (const el of topLevelElements(doc)) {
      rules.push({
        origin: Tier.Base,
        match: { kind: 'element', element: el },
        specificity: [0, 0, 0],
        order: order++,
        declarations: decls,
      })
    }
  }

  // Tier 2: tagStyles — keyed by tag.
  for (const [tag, style] of Object.entries(options.tagStyles ?? {})) {
    rules.push({
      origin: Tier.Tag,
      match: { kind: 'tag', tag },
      specificity: [0, 0, 1],
      order: order++,
      declarations: objectToDecls(style),
    })
  }

  // Tier 3: classStyles — keyed by class.
  for (const [className, style] of Object.entries(options.classStyles ?? {})) {
    rules.push({
      origin: Tier.Class,
      match: { kind: 'class', className },
      specificity: [0, 1, 0],
      order: order++,
      declarations: objectToDecls(style),
    })
  }

  // Tier 4: <style> blocks.
  for (const styleEl of getElementsByTagName('style', doc)) {
    for (const raw of parseStylesheet(getText(styleEl))) {
      const decls = mapInto(raw.declarations, Tier.Style, raw.selector, diagnostics)
      if (decls.length === 0) continue
      rules.push({
        origin: Tier.Style,
        match: { kind: 'selector', selector: raw.selector },
        specificity: specificity(raw.selector),
        order: order++,
        declarations: decls,
      })
    }
  }

  // Tier 5: inline style attributes (use findAll to get ALL elements).
  for (const el of findAll(() => true, doc.children)) {
    const styleAttr = el.attribs['style']
    if (!styleAttr) continue
    const decls = mapInto(parseInline(styleAttr), Tier.Inline, undefined, diagnostics)
    if (decls.length === 0) continue
    rules.push({
      origin: Tier.Inline,
      match: { kind: 'element', element: el },
      specificity: [1, 0, 0],
      order: order++,
      declarations: decls,
    })
  }

  return { rules, diagnostics }
}

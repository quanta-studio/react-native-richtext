import { selectAll } from 'css-select'
import {
  getElementsByTagName,
  getAttributeValue,
  findAll,
  isTag,
} from '@yk-yong/react-native-richtext-dom'
import type { Document, Element } from '@yk-yong/react-native-richtext-dom'
import type { Rule } from '../types'

function classTokens(el: Element): string[] {
  const cls = getAttributeValue(el, 'class')
  return cls ? cls.trim().split(/\s+/) : []
}

/** Map each rule to the elements it applies to. */
export function matchRules(doc: Document, rules: Rule[]): Map<Element, Rule[]> {
  const out = new Map<Element, Rule[]>()
  const add = (el: Element, rule: Rule) => {
    const list = out.get(el)
    if (list) list.push(rule)
    else out.set(el, [rule])
  }

  for (const rule of rules) {
    const m = rule.match
    switch (m.kind) {
      case 'selector':
        for (const node of selectAll(m.selector, doc)) {
          if (isTag(node)) add(node, rule)
        }
        break
      case 'tag':
        for (const el of getElementsByTagName(m.tag, doc)) add(el, rule)
        break
      case 'class':
        for (const el of findAll(() => true, doc.children)) {
          if (classTokens(el).includes(m.className)) add(el, rule)
        }
        break
      case 'element':
        add(m.element, rule)
        break
    }
  }
  return out
}

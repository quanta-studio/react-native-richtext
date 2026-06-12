import * as csstree from 'css-tree'
import type { Specificity } from '../types'

/** Compute CSS specificity (a, b, c) for a single complex selector string. */
export function specificity(selector: string): Specificity {
  const ast = csstree.parse(selector, { context: 'selector' })
  let a = 0
  let b = 0
  let c = 0
  csstree.walk(ast, (node) => {
    switch (node.type) {
      case 'IdSelector':
        a += 1
        break
      case 'ClassSelector':
      case 'AttributeSelector':
      case 'PseudoClassSelector':
        b += 1
        break
      case 'TypeSelector':
        if (node.name !== '*') c += 1
        break
      case 'PseudoElementSelector':
        c += 1
        break
      default:
        break
    }
  })
  return [a, b, c]
}

/** Compare two specificities; returns >0 if x wins, <0 if y wins, 0 if equal. */
export function compareSpecificity(x: Specificity, y: Specificity): number {
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

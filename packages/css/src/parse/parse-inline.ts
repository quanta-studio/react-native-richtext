import * as csstree from 'css-tree'
import type { RawDecl } from './parse-stylesheet'

/** Parse an inline `style=""` attribute value into raw declarations. */
export function parseInline(style: string): RawDecl[] {
  const ast = csstree.parse(style, { context: 'declarationList' })
  const decls: RawDecl[] = []
  if (ast.type !== 'DeclarationList') return decls
  ast.children.forEach((node) => {
    if (node.type !== 'Declaration') return
    decls.push({
      property: node.property,
      value: csstree.generate(node.value).trim(),
      important: node.important === true,
    })
  })
  return decls
}

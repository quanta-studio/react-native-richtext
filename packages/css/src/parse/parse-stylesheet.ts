import * as csstree from 'css-tree'

export interface RawDecl {
  property: string
  value: string
  important: boolean
}

export interface RawRule {
  selector: string
  declarations: RawDecl[]
}

function readDeclarations(block: csstree.Block): RawDecl[] {
  const decls: RawDecl[] = []
  block.children.forEach((node) => {
    if (node.type !== 'Declaration') return
    decls.push({
      property: node.property,
      value: csstree.generate(node.value).trim(),
      important: node.important === true,
    })
  })
  return decls
}

/** Parse a CSS stylesheet string into flat rules, one per selector. At-rules are ignored. */
export function parseStylesheet(css: string): RawRule[] {
  const ast = csstree.parse(css)
  const rules: RawRule[] = []
  // Only walk top-level rules in the stylesheet body (skips Atrule subtrees).
  if (ast.type !== 'StyleSheet') return rules
  ast.children.forEach((node) => {
    if (node.type !== 'Rule') return
    if (node.prelude.type !== 'SelectorList') return
    const declarations = readDeclarations(node.block)
    node.prelude.children.forEach((sel) => {
      rules.push({ selector: csstree.generate(sel).trim(), declarations })
    })
  })
  return rules
}

# Phase 1: `@scope/css` Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@yk-yong/rn-rich-text-css` — a React-free package whose `resolveStyles(document, options)` turns a parsed DOM plus consumer styles into a fully-computed `Map<Element, ComputedStyle>` (cascade + inheritance applied, relative units resolved), with optional diagnostics.

**Architecture:** Approach B — `collect → match → cascade → compute` as separate, independently-testable stages. CSS-text declarations are shorthand-expanded and mapped to RN longhand props at collection time so the cascade competes at longhand granularity. Relative units that need element context (`em`/`rem`/`%`/unitless `line-height`) are carried as deferred tokens and finalized in a single top-down compute pass. The output `ComputedStyle` carries a pure `RNStyle` plus a small typed `control` block (`display`/`whiteSpace`/`listStyle*`) the renderer needs but that aren't RN style keys.

**Tech Stack:** TypeScript 6 (strict, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`), Vitest 4, tsup, pnpm workspaces. New deps: `css-tree` (parse), `css-select` (selector match on domhandler nodes), `css-to-react-native` (shorthand expansion + value parse). Workspace dep: `@yk-yong/rn-rich-text-dom`. Specificity is hand-rolled from the css-tree selector AST (no `@csstools/selector-specificity`).

**Planning-time resolutions of spec open questions:**
- Specificity: **hand-rolled** from the css-tree selector AST (avoids a second selector parser + AST mismatch with css-select).
- `RNStyle`: **hand-authored curated subset** (keeps the package free of any `react-native`/React type dependency; the whitelist is the type).
- `mapping/` calls `css-to-react-native` **per declaration** (clean diagnostic granularity); relative-unit values it cannot parse fall back to our own deferral path.

**Reference:** spec at `docs/specs/2026-06-12-phase-1-css-engine-design.md`. Mirror `packages/dom` for all config.

---

## File Structure

```
packages/css/
  package.json
  tsconfig.json            # composite, emitDeclarationOnly (mirror dom)
  tsconfig.test.json       # noEmit, includes src+test
  tsup.config.ts           # esm+cjs, dts:false
  README.md
  LICENSE
  src/
    index.ts               # public barrel: resolveStyles + public types
    types.ts               # RNStyle, RNDecl, Rule, Tier, ComputedStyle, Diagnostic, options...
    options.ts             # ResolveOptions defaults helper
    util/
      camel-case.ts        # kebab-case CSS prop -> camelCase
    specificity/
      specificity.ts       # selector string -> [a,b,c]
    parse/
      parse-stylesheet.ts  # css text -> RawRule[]
      parse-inline.ts      # style="" -> RawDecl[]
    mapping/
      whitelist.ts         # camelCase prop -> kind (style|control|unsupported)
      map-declaration.ts   # RawDecl -> { decls: RNDecl[]; diagnostics }
      expand-deferred.ts   # relative-unit fallback expansion
    units/
      resolve-deferred.ts  # DeferredLength + font context -> number
    ua/
      ua-stylesheet.ts     # UA css text
      ua-rules.ts          # buildUaRules(): Rule[]
    collect/
      object-to-decls.ts   # RNStyle object -> RNDecl[]
      collect-rules.ts     # document+options -> { rules: Rule[]; diagnostics }
    match/
      match-rules.ts       # document+rules -> Map<Element, Rule[]>
    cascade/
      cascade.ts           # Rule[] (one element) -> SpecifiedStyle
    inherit/
      inherited.ts         # INHERITED set
    resolve/
      compute-element.ts   # specified + parent computed -> ComputedStyle
      resolve-styles.ts    # orchestrator
  test/
    *.test.ts              # one per module + integration/fixtures
    fixtures/*.html
```

Run a single test file with: `pnpm exec vitest run packages/css/test/<name>.test.ts`
Typecheck the package with: `pnpm --filter @yk-yong/rn-rich-text-css typecheck`

---

## Task 0: Scaffold the `@yk-yong/rn-rich-text-css` package

**Files:**
- Create: `packages/css/package.json`, `packages/css/tsconfig.json`, `packages/css/tsconfig.test.json`, `packages/css/tsup.config.ts`, `packages/css/README.md`, `packages/css/LICENSE`, `packages/css/src/index.ts`
- Modify: `tsconfig.json` (root) — add project reference

- [ ] **Step 1: Create `packages/css/package.json`** (mirror `packages/dom/package.json`)

```json
{
  "name": "@yk-yong/rn-rich-text-css",
  "version": "0.0.0",
  "description": "CSS engine for rn-rich-text: cascade, specificity, inheritance, and declaration->RN style resolution. React-free.",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc -p tsconfig.test.json",
    "clean": "rimraf dist"
  },
  "publishConfig": { "access": "public" },
  "keywords": ["css", "cascade", "react-native", "rich-text", "stylesheet"],
  "dependencies": {
    "@yk-yong/rn-rich-text-dom": "workspace:*",
    "css-select": "^6.0.0",
    "css-to-react-native": "^3.2.0",
    "css-tree": "^3.1.0"
  },
  "devDependencies": {
    "@types/css-tree": "^2.3.10"
  }
}
```

- [ ] **Step 2: Create `packages/css/tsconfig.json`** (identical to `packages/dom/tsconfig.json` plus a reference to dom)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist",
    "emitDeclarationOnly": true,
    "tsBuildInfoFile": "tsconfig.tsbuildinfo"
  },
  "include": ["src"],
  "references": [{ "path": "../dom" }]
}
```

- [ ] **Step 3: Create `packages/css/tsconfig.test.json`** (identical to dom's)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": false,
    "noEmit": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 4: Create `packages/css/tsup.config.ts`** (identical to dom's) and `README.md` + copy `LICENSE`

`packages/css/tsup.config.ts`:

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  dts: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
})
```

`packages/css/README.md`:

```md
# @yk-yong/rn-rich-text-css

CSS engine for rn-rich-text: parses stylesheets and inline styles, matches
selectors, applies the cascade + inheritance, and resolves declarations into
React Native style objects. React-free pure logic.

Not yet published — internal to the rn-rich-text monorepo.
```

Copy the license: `cp packages/dom/LICENSE packages/css/LICENSE`

- [ ] **Step 5: Add the root project reference** in `tsconfig.json` (root)

```json
{
  "files": [],
  "references": [{ "path": "packages/dom" }, { "path": "packages/css" }]
}
```

- [ ] **Step 6: Create a placeholder `packages/css/src/index.ts`** so the build has an entry

```ts
export {}
```

- [ ] **Step 7: Install dependencies**

Run: `pnpm install`
Expected: resolves the new workspace package and deps; lockfile updates; exit 0.

- [ ] **Step 8: Verify it builds and typechecks**

Run: `pnpm --filter @yk-yong/rn-rich-text-css typecheck && pnpm --filter @yk-yong/rn-rich-text-css build`
Expected: exit 0; `packages/css/dist/index.js` + `index.cjs` produced.

- [ ] **Step 9: Commit**

```bash
git add packages/css tsconfig.json pnpm-lock.yaml
git commit -m "chore(css): scaffold @yk-yong/rn-rich-text-css package"
```

---

## Task 1: Core types (`types.ts`)

**Files:**
- Create: `packages/css/src/types.ts`
- Test: `packages/css/test/types.test.ts`

`types.ts` is excluded from coverage (per `vitest.config.ts`), but a structural test pins the shapes and catches accidental signature drift.

- [ ] **Step 1: Write the failing test** — `packages/css/test/types.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import type {
  RNStyle,
  RNDecl,
  Rule,
  Tier,
  TargetProp,
  ComputedStyle,
  DeferredLength,
  Diagnostic,
  ResolveOptions,
} from '../src/types'

describe('types', () => {
  it('constructs an RNDecl with a final value', () => {
    const d: RNDecl = { prop: 'color', value: '#ff0000', important: false }
    expect(d.prop).toBe('color')
  })

  it('constructs an RNDecl with a deferred length', () => {
    const def: DeferredLength = { kind: 'deferred-length', unit: 'em', number: 1.5, prop: 'fontSize' }
    const d: RNDecl = { prop: 'fontSize', value: def, important: false }
    expect((d.value as DeferredLength).unit).toBe('em')
  })

  it('constructs a Rule and ComputedStyle', () => {
    const rule: Rule = {
      origin: 4 as Tier,
      match: { kind: 'selector', selector: 'p' },
      specificity: [0, 0, 1],
      order: 0,
      declarations: [{ prop: 'color', value: 'red', important: false }],
    }
    expect(rule.match.kind).toBe('selector')

    const computed: ComputedStyle = {
      style: { color: 'red', fontSize: 16 },
      control: { display: 'block', whiteSpace: 'normal' },
    }
    expect(computed.control.display).toBe('block')

    const target: TargetProp = 'display'
    const diag: Diagnostic = { property: 'float', value: 'left', reason: 'unknown-property', tier: 4 as Tier }
    const opts: ResolveOptions = { rootFontSize: 16, collectDiagnostics: true }
    expect([target, diag.reason, opts.rootFontSize]).toEqual(['display', 'unknown-property', 16])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/css/test/types.test.ts`
Expected: FAIL — cannot resolve `../src/types`.

- [ ] **Step 3: Write `packages/css/src/types.ts`**

```ts
import type { Element, Document } from '@yk-yong/rn-rich-text-dom'

export type { Element, Document }

/** Curated, hand-authored subset of RN TextStyle & ViewStyle. The whitelist IS the type. */
export interface RNStyle {
  color?: string
  fontFamily?: string
  fontSize?: number
  fontStyle?: 'normal' | 'italic'
  fontWeight?:
    | 'normal' | 'bold'
    | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
  fontVariant?: string[]
  lineHeight?: number
  letterSpacing?: number
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify'
  textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through'
  textDecorationColor?: string
  textDecorationStyle?: 'solid' | 'double' | 'dotted' | 'dashed'
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  backgroundColor?: string
  opacity?: number
  margin?: number | string
  marginTop?: number | string
  marginRight?: number | string
  marginBottom?: number | string
  marginLeft?: number | string
  padding?: number | string
  paddingTop?: number | string
  paddingRight?: number | string
  paddingBottom?: number | string
  paddingLeft?: number | string
  width?: number | string
  height?: number | string
  minWidth?: number | string
  maxWidth?: number | string
  minHeight?: number | string
  maxHeight?: number | string
  borderColor?: string
  borderTopColor?: string
  borderRightColor?: string
  borderBottomColor?: string
  borderLeftColor?: string
  borderWidth?: number
  borderTopWidth?: number
  borderRightWidth?: number
  borderBottomWidth?: number
  borderLeftWidth?: number
  borderRadius?: number
  borderStyle?: 'solid' | 'dotted' | 'dashed'
  gap?: number
  aspectRatio?: number
}

export type RNStyleProp = keyof RNStyle

/** CSS-computed props the renderer needs that are not RN style keys. */
export interface ControlStyle {
  display: 'block' | 'inline' | 'inline-block' | 'list-item' | 'none'
  whiteSpace: 'normal' | 'pre' | 'pre-wrap' | 'pre-line' | 'nowrap'
  listStyleType?: string
  listStylePosition?: 'inside' | 'outside'
}

export type ControlProp = keyof ControlStyle
export type TargetProp = RNStyleProp | ControlProp

export interface ComputedStyle {
  style: RNStyle
  control: ControlStyle
}

/** Cascade tiers, low -> high precedence. */
export type Tier = 0 | 1 | 2 | 3 | 4 | 5 // UA, baseStyle, tagStyles, classStyles, <style>, inline
export const Tier = {
  UA: 0,
  Base: 1,
  Tag: 2,
  Class: 3,
  Style: 4,
  Inline: 5,
} as const

export type Specificity = readonly [number, number, number]

export interface DeferredLength {
  readonly kind: 'deferred-length'
  readonly unit: 'em' | 'rem' | '%' | 'unitless'
  readonly number: number
  readonly prop: RNStyleProp
}

export type ResolvedValue = number | string | string[]
export type DeclValue = ResolvedValue | DeferredLength

export interface RNDecl {
  readonly prop: TargetProp
  readonly value: DeclValue
  readonly important: boolean
}

export type MatchTarget =
  | { kind: 'selector'; selector: string }
  | { kind: 'tag'; tag: string }
  | { kind: 'class'; className: string }
  | { kind: 'element'; element: Element }

export interface Rule {
  readonly origin: Tier
  readonly match: MatchTarget
  readonly specificity: Specificity
  readonly order: number
  readonly declarations: readonly RNDecl[]
}

export type DiagnosticReason =
  | 'unknown-property'
  | 'unsupported-value'
  | 'unsupported-unit'
  | 'parse-error'

export interface Diagnostic {
  readonly property: string
  readonly value: string
  readonly reason: DiagnosticReason
  readonly selector?: string
  readonly tier: Tier
}

export interface ResolveOptions {
  baseStyle?: RNStyle
  tagStyles?: Record<string, RNStyle>
  classStyles?: Record<string, RNStyle>
  rootFontSize?: number
  collectDiagnostics?: boolean
}

export interface ResolveResult {
  styles: Map<Element, ComputedStyle>
  diagnostics: Diagnostic[]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/css/test/types.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/css/src/types.ts packages/css/test/types.test.ts
git commit -m "feat(css): add core type definitions"
```

---

## Task 2: kebab→camel utility (`util/camel-case.ts`)

**Files:**
- Create: `packages/css/src/util/camel-case.ts`
- Test: `packages/css/test/camel-case.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { camelCase } from '../src/util/camel-case'

describe('camelCase', () => {
  it.each([
    ['color', 'color'],
    ['background-color', 'backgroundColor'],
    ['border-top-width', 'borderTopWidth'],
    ['-webkit-box-shadow', 'WebkitBoxShadow'],
    ['MARGIN-TOP', 'marginTop'],
  ])('%s -> %s', (input, expected) => {
    expect(camelCase(input)).toBe(expected)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/css/test/camel-case.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/css/src/util/camel-case.ts`**

```ts
/** Convert a kebab-case CSS property name to camelCase (lower-casing first). */
export function camelCase(prop: string): string {
  return prop
    .toLowerCase()
    .replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase())
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/css/test/camel-case.test.ts`
Expected: PASS (5 cases). Note `-webkit-box-shadow` -> `WebkitBoxShadow` (leading dash capitalises) is intentional; such props are not whitelisted and will be dropped later.

- [ ] **Step 5: Commit**

```bash
git add packages/css/src/util/camel-case.ts packages/css/test/camel-case.test.ts
git commit -m "feat(css): add kebab-to-camel property utility"
```

---

## Task 3: Specificity (`specificity/specificity.ts`)

**Files:**
- Create: `packages/css/src/specificity/specificity.ts`
- Test: `packages/css/test/specificity.test.ts`

Hand-rolled from the css-tree selector AST. `(a, b, c)` = (id, class/attr/pseudo-class, type/pseudo-element) counts.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { specificity } from '../src/specificity/specificity'

describe('specificity', () => {
  it.each<[string, [number, number, number]]>([
    ['*', [0, 0, 0]],
    ['li', [0, 0, 1]],
    ['ul li', [0, 0, 2]],
    ['ul > li', [0, 0, 2]],
    ['.note', [0, 1, 0]],
    ['li.note', [0, 1, 1]],
    ['#main', [1, 0, 0]],
    ['#main .note p', [1, 1, 1]],
    ['a[href]', [0, 1, 1]],
    ['li:first-child', [0, 1, 1]],
    ['p::first-line', [0, 0, 2]],
  ])('specificity(%s) === %j', (selector, expected) => {
    expect(specificity(selector)).toEqual(expected)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/css/test/specificity.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/css/src/specificity/specificity.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/css/test/specificity.test.ts`
Expected: PASS (11 cases).

- [ ] **Step 5: Add a `compareSpecificity` test, then commit**

Append to the test file:

```ts
import { compareSpecificity } from '../src/specificity/specificity'

describe('compareSpecificity', () => {
  it('orders by a, then b, then c', () => {
    expect(compareSpecificity([1, 0, 0], [0, 9, 9]) > 0).toBe(true)
    expect(compareSpecificity([0, 1, 0], [0, 0, 9]) > 0).toBe(true)
    expect(compareSpecificity([0, 0, 1], [0, 0, 1])).toBe(0)
  })
})
```

Run: `pnpm exec vitest run packages/css/test/specificity.test.ts` → PASS, then:

```bash
git add packages/css/src/specificity/specificity.ts packages/css/test/specificity.test.ts
git commit -m "feat(css): hand-roll selector specificity from css-tree AST"
```

---

## Task 4: Parse stylesheets and inline styles (`parse/`)

**Files:**
- Create: `packages/css/src/parse/parse-stylesheet.ts`, `packages/css/src/parse/parse-inline.ts`
- Test: `packages/css/test/parse.test.ts`

Output shapes (add to nothing; local to parse): `RawDecl = { property: string; value: string; important: boolean }`, `RawRule = { selector: string; declarations: RawDecl[] }`. Selector lists are split so each `RawRule` has exactly one selector (its own specificity).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parseStylesheet } from '../src/parse/parse-stylesheet'
import { parseInline } from '../src/parse/parse-inline'

describe('parseStylesheet', () => {
  it('splits selector lists into one rule each', () => {
    const rules = parseStylesheet('h1, h2 { color: red; margin: 0 }')
    expect(rules.map((r) => r.selector)).toEqual(['h1', 'h2'])
    expect(rules[0]!.declarations).toEqual([
      { property: 'color', value: 'red', important: false },
      { property: 'margin', value: '0', important: false },
    ])
  })

  it('captures !important', () => {
    const rules = parseStylesheet('p { color: blue !important }')
    expect(rules[0]!.declarations[0]).toEqual({ property: 'color', value: 'blue', important: true })
  })

  it('skips at-rules like @media', () => {
    const rules = parseStylesheet('@media screen { p { color: red } } div { color: blue }')
    expect(rules.map((r) => r.selector)).toEqual(['div'])
  })

  it('returns [] for empty or comment-only input', () => {
    expect(parseStylesheet('/* nothing */')).toEqual([])
  })
})

describe('parseInline', () => {
  it('parses an inline style attribute', () => {
    expect(parseInline('color: red; font-size: 14px')).toEqual([
      { property: 'color', value: 'red', important: false },
      { property: 'font-size', value: '14px', important: false },
    ])
  })

  it('captures !important and tolerates trailing semicolons', () => {
    expect(parseInline('color: red !important;')).toEqual([
      { property: 'color', value: 'red', important: true },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/css/test/parse.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `packages/css/src/parse/parse-stylesheet.ts`**

```ts
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
```

- [ ] **Step 4: Implement `packages/css/src/parse/parse-inline.ts`**

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/css/test/parse.test.ts`
Expected: PASS (6 tests). If `@media` content leaks through, confirm the `node.type !== 'Rule'` guard skips `Atrule` nodes (it does — at-rules are a different node type at the stylesheet top level).

- [ ] **Step 6: Commit**

```bash
git add packages/css/src/parse packages/css/test/parse.test.ts
git commit -m "feat(css): parse stylesheets and inline styles via css-tree"
```

---

## Task 5: Property whitelist (`mapping/whitelist.ts`)

**Files:**
- Create: `packages/css/src/mapping/whitelist.ts`
- Test: `packages/css/test/whitelist.test.ts`

Classifies a **camelCased** property as a style prop, a control prop, or unsupported.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { classifyProp } from '../src/mapping/whitelist'

describe('classifyProp', () => {
  it('classifies style props', () => {
    expect(classifyProp('color')).toBe('style')
    expect(classifyProp('marginTop')).toBe('style')
    expect(classifyProp('backgroundColor')).toBe('style')
  })

  it('classifies shorthand style props (expanded later by css-to-react-native)', () => {
    expect(classifyProp('margin')).toBe('style')
    expect(classifyProp('padding')).toBe('style')
  })

  it('classifies control props', () => {
    expect(classifyProp('display')).toBe('control')
    expect(classifyProp('whiteSpace')).toBe('control')
    expect(classifyProp('listStyleType')).toBe('control')
  })

  it('classifies unsupported props', () => {
    expect(classifyProp('float')).toBe('unsupported')
    expect(classifyProp('position')).toBe('unsupported')
    expect(classifyProp('WebkitBoxShadow')).toBe('unsupported')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/css/test/whitelist.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/css/src/mapping/whitelist.ts`**

```ts
/**
 * Whitelist of supported CSS properties (camelCase), curated to the v1 tag set.
 * `style` props become RNStyle; `control` props become ComputedStyle.control.
 * Shorthands (margin/padding/border/font/etc.) are listed and expanded downstream.
 */
const STYLE_PROPS = new Set<string>([
  // text
  'color', 'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'fontVariant',
  'lineHeight', 'letterSpacing', 'textAlign', 'textTransform',
  'textDecoration', 'textDecorationLine', 'textDecorationColor', 'textDecorationStyle',
  'font',
  // box
  'backgroundColor', 'background', 'opacity',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  // border
  'border', 'borderColor', 'borderWidth', 'borderStyle', 'borderRadius',
  'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  // fabric-widened
  'gap', 'aspectRatio',
])

const CONTROL_PROPS = new Set<string>([
  'display', 'whiteSpace', 'listStyleType', 'listStylePosition', 'listStyle',
])

export type PropKind = 'style' | 'control' | 'unsupported'

/** Classify a camelCased CSS property. */
export function classifyProp(camelProp: string): PropKind {
  if (CONTROL_PROPS.has(camelProp)) return 'control'
  if (STYLE_PROPS.has(camelProp)) return 'style'
  return 'unsupported'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/css/test/whitelist.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/css/src/mapping/whitelist.ts packages/css/test/whitelist.test.ts
git commit -m "feat(css): add curated CSS property whitelist"
```

---

## Task 6: Deferred-length expansion (`mapping/expand-deferred.ts`)

**Files:**
- Create: `packages/css/src/mapping/expand-deferred.ts`
- Test: `packages/css/test/expand-deferred.test.ts`

The fallback path for values `css-to-react-native` cannot parse (relative units). Produces RN longhand decls whose values may be `DeferredLength` tokens. Box shorthands (`margin`/`padding`) are split into the 1-4 value model.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { expandDeferred } from '../src/mapping/expand-deferred'
import type { DeferredLength } from '../src/types'

const def = (unit: DeferredLength['unit'], number: number, prop: string): DeferredLength =>
  ({ kind: 'deferred-length', unit, number, prop: prop as DeferredLength['prop'] })

describe('expandDeferred', () => {
  it('defers em on font-size', () => {
    expect(expandDeferred('fontSize', '1.5em')).toEqual([{ prop: 'fontSize', value: def('em', 1.5, 'fontSize') }])
  })

  it('defers rem on a single length prop', () => {
    expect(expandDeferred('width', '2rem')).toEqual([{ prop: 'width', value: def('rem', 2, 'width') }])
  })

  it('defers unitless line-height', () => {
    expect(expandDeferred('lineHeight', '1.5')).toEqual([{ prop: 'lineHeight', value: def('unitless', 1.5, 'lineHeight') }])
  })

  it('resolves % to a deferred number only for font-size and line-height', () => {
    expect(expandDeferred('fontSize', '120%')).toEqual([{ prop: 'fontSize', value: def('%', 120, 'fontSize') }])
    expect(expandDeferred('lineHeight', '150%')).toEqual([{ prop: 'lineHeight', value: def('%', 150, 'lineHeight') }])
  })

  it('passes % through as a string for layout props', () => {
    expect(expandDeferred('width', '50%')).toEqual([{ prop: 'width', value: '50%' }])
  })

  it('expands a box shorthand with mixed units', () => {
    expect(expandDeferred('margin', '1em 0')).toEqual([
      { prop: 'marginTop', value: def('em', 1, 'marginTop') },
      { prop: 'marginRight', value: 0 },
      { prop: 'marginBottom', value: def('em', 1, 'marginBottom') },
      { prop: 'marginLeft', value: 0 },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/css/test/expand-deferred.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/css/src/mapping/expand-deferred.ts`**

```ts
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
  const m = /^(-?\d*\.?\d+)(em|rem|%|px)?$/i.exec(t)
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/css/test/expand-deferred.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/css/src/mapping/expand-deferred.ts packages/css/test/expand-deferred.test.ts
git commit -m "feat(css): expand relative-unit values into deferred longhands"
```

---

## Task 7: Map a declaration (`mapping/map-declaration.ts`)

**Files:**
- Create: `packages/css/src/mapping/map-declaration.ts`
- Test: `packages/css/test/map-declaration.test.ts`

Ties the mapping pieces together: whitelist gate → css-to-react-native for context-free values → `expandDeferred` fallback for relative units → diagnostics. Pure: returns `{ decls, diagnostics }` where diagnostics omit `tier`/`selector` (the collector attaches those).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { mapDeclaration } from '../src/mapping/map-declaration'
import type { DeferredLength } from '../src/types'

describe('mapDeclaration', () => {
  it('maps a simple context-free declaration', () => {
    const out = mapDeclaration({ property: 'color', value: 'red', important: false })
    expect(out.decls).toEqual([{ prop: 'color', value: 'red', important: false }])
    expect(out.diagnostics).toEqual([])
  })

  it('expands a context-free shorthand via css-to-react-native', () => {
    const out = mapDeclaration({ property: 'margin', value: '1px 2px', important: false })
    expect(out.decls).toEqual([
      { prop: 'marginTop', value: 1, important: false },
      { prop: 'marginRight', value: 2, important: false },
      { prop: 'marginBottom', value: 1, important: false },
      { prop: 'marginLeft', value: 2, important: false },
    ])
  })

  it('routes a control prop into a control decl', () => {
    const out = mapDeclaration({ property: 'display', value: 'block', important: false })
    expect(out.decls).toEqual([{ prop: 'display', value: 'block', important: false }])
  })

  it('defers a relative-unit value', () => {
    const out = mapDeclaration({ property: 'font-size', value: '1.5em', important: false })
    const v = out.decls[0]!.value as DeferredLength
    expect(v).toEqual({ kind: 'deferred-length', unit: 'em', number: 1.5, prop: 'fontSize' })
  })

  it('preserves !important', () => {
    const out = mapDeclaration({ property: 'color', value: 'blue', important: true })
    expect(out.decls[0]!.important).toBe(true)
  })

  it('emits unknown-property diagnostic and no decls', () => {
    const out = mapDeclaration({ property: 'float', value: 'left', important: false })
    expect(out.decls).toEqual([])
    expect(out.diagnostics).toEqual([{ property: 'float', value: 'left', reason: 'unknown-property' }])
  })

  it('emits unsupported-value diagnostic when css-to-react-native throws on a known prop', () => {
    const out = mapDeclaration({ property: 'width', value: 'calc(100% - 10px)', important: false })
    expect(out.decls).toEqual([])
    expect(out.diagnostics[0]!.reason).toBe('unsupported-value')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/css/test/map-declaration.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/css/src/mapping/map-declaration.ts`**

```ts
import { getStylesForProperty } from 'css-to-react-native'
import { camelCase } from '../util/camel-case'
import { classifyProp } from './whitelist'
import { expandDeferred } from './expand-deferred'
import type { RawDecl } from '../parse/parse-stylesheet'
import type { DiagnosticReason, RNDecl, TargetProp } from '../types'

export interface MapDiagnostic {
  property: string
  value: string
  reason: DiagnosticReason
}

export interface MapResult {
  decls: RNDecl[]
  diagnostics: MapDiagnostic[]
}

const RELATIVE_UNIT = /(?:^|\s)-?\d*\.?\d+(?:em|rem|%)\b/i

function looksRelative(camelProp: string, value: string): boolean {
  if (RELATIVE_UNIT.test(value)) return true
  // unitless line-height (e.g. "1.5") must be multiplied by font-size
  if (camelProp === 'lineHeight' && /^-?\d*\.?\d+$/.test(value.trim())) return true
  return false
}

/** Map one raw declaration into RN longhand decls, collecting any diagnostic. */
export function mapDeclaration(decl: RawDecl): MapResult {
  const camel = camelCase(decl.property)
  const kind = classifyProp(camel)

  if (kind === 'unsupported') {
    return { decls: [], diagnostics: [{ property: decl.property, value: decl.value, reason: 'unknown-property' }] }
  }

  if (kind === 'control') {
    return {
      decls: [{ prop: camel as TargetProp, value: decl.value, important: decl.important }],
      diagnostics: [],
    }
  }

  // style prop
  if (looksRelative(camel, decl.value)) {
    const expanded = expandDeferred(camel, decl.value)
    return {
      decls: expanded.map((e) => ({ prop: e.prop, value: e.value, important: decl.important })),
      diagnostics: [],
    }
  }

  try {
    const rn = getStylesForProperty(camel, decl.value)
    const decls: RNDecl[] = Object.entries(rn).map(([prop, value]) => ({
      prop: prop as TargetProp,
      value: value as RNDecl['value'],
      important: decl.important,
    }))
    return { decls, diagnostics: [] }
  } catch {
    return { decls: [], diagnostics: [{ property: decl.property, value: decl.value, reason: 'unsupported-value' }] }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/css/test/map-declaration.test.ts`
Expected: PASS (7 tests). If `getStylesForProperty` is not found as a named export, import the default `transform` instead and call `transform([[camel, decl.value]])` — but the named export exists in `css-to-react-native@^3`.

- [ ] **Step 5: Commit**

```bash
git add packages/css/src/mapping/map-declaration.ts packages/css/test/map-declaration.test.ts
git commit -m "feat(css): map declarations to RN style with diagnostics"
```

---

## Task 8: Resolve deferred lengths (`units/resolve-deferred.ts`)

**Files:**
- Create: `packages/css/src/units/resolve-deferred.ts`
- Test: `packages/css/test/resolve-deferred.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { resolveDeferred } from '../src/units/resolve-deferred'
import type { DeferredLength } from '../src/types'

const ctx = { ownFontSize: 20, parentFontSize: 16, rootFontSize: 16 }
const d = (unit: DeferredLength['unit'], number: number, prop: string): DeferredLength =>
  ({ kind: 'deferred-length', unit, number, prop: prop as DeferredLength['prop'] })

describe('resolveDeferred', () => {
  it('em on font-size uses the parent font-size', () => {
    expect(resolveDeferred(d('em', 1.5, 'fontSize'), ctx)).toBe(24) // 1.5 * 16
  })

  it('em on a non-font-size prop uses the own font-size', () => {
    expect(resolveDeferred(d('em', 2, 'marginTop'), ctx)).toBe(40) // 2 * 20
  })

  it('rem uses the root font-size', () => {
    expect(resolveDeferred(d('rem', 2, 'width'), ctx)).toBe(32) // 2 * 16
  })

  it('% on font-size uses the parent font-size', () => {
    expect(resolveDeferred(d('%', 150, 'fontSize'), ctx)).toBe(24) // 1.5 * 16
  })

  it('% on line-height uses the own font-size', () => {
    expect(resolveDeferred(d('%', 150, 'lineHeight'), ctx)).toBe(30) // 1.5 * 20
  })

  it('unitless line-height multiplies the own font-size', () => {
    expect(resolveDeferred(d('unitless', 1.5, 'lineHeight'), ctx)).toBe(30) // 1.5 * 20
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/css/test/resolve-deferred.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/css/src/units/resolve-deferred.ts`**

```ts
import type { DeferredLength } from '../types'

export interface FontContext {
  ownFontSize: number
  parentFontSize: number
  rootFontSize: number
}

/** Resolve a deferred relative length into an absolute number given the font-size context. */
export function resolveDeferred(d: DeferredLength, ctx: FontContext): number {
  switch (d.unit) {
    case 'rem':
      return d.number * ctx.rootFontSize
    case 'em':
      return d.number * (d.prop === 'fontSize' ? ctx.parentFontSize : ctx.ownFontSize)
    case '%':
      return (d.number / 100) * (d.prop === 'fontSize' ? ctx.parentFontSize : ctx.ownFontSize)
    case 'unitless':
      return d.number * ctx.ownFontSize
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/css/test/resolve-deferred.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/css/src/units/resolve-deferred.ts packages/css/test/resolve-deferred.test.ts
git commit -m "feat(css): resolve deferred relative units against font context"
```

---

## Task 9: Inherited-property set (`inherit/inherited.ts`)

**Files:**
- Create: `packages/css/src/inherit/inherited.ts`
- Test: `packages/css/test/inherited.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { INHERITED, isInherited } from '../src/inherit/inherited'

describe('INHERITED', () => {
  it('includes the inherited text + control props', () => {
    for (const p of ['color', 'fontSize', 'fontFamily', 'lineHeight', 'textAlign', 'whiteSpace', 'listStyleType']) {
      expect(isInherited(p)).toBe(true)
    }
  })

  it('excludes non-inherited props', () => {
    for (const p of ['margin', 'marginTop', 'padding', 'width', 'display', 'backgroundColor', 'borderWidth']) {
      expect(isInherited(p)).toBe(false)
    }
  })

  it('exposes a stable set', () => {
    expect(INHERITED.has('color')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/css/test/inherited.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/css/src/inherit/inherited.ts`**

```ts
import type { TargetProp } from '../types'

/** CSS-inherited properties relevant to RN/v1 (style + control). */
export const INHERITED: ReadonlySet<TargetProp> = new Set<TargetProp>([
  'color',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'fontVariant',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textTransform',
  'whiteSpace',
  'listStyleType',
  'listStylePosition',
])

export function isInherited(prop: string): boolean {
  return INHERITED.has(prop as TargetProp)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/css/test/inherited.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/css/src/inherit/inherited.ts packages/css/test/inherited.test.ts
git commit -m "feat(css): define the inherited-property set"
```

---

## Task 10: UA stylesheet (`ua/`)

**Files:**
- Create: `packages/css/src/ua/ua-stylesheet.ts`, `packages/css/src/ua/ua-rules.ts`
- Test: `packages/css/test/ua-rules.test.ts`

The UA sheet is authored as CSS text and run through `parseStylesheet` + `mapDeclaration` + `specificity` to produce `Rule[]` at origin tier `Tier.UA`. This dogfoods the pipeline.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildUaRules } from '../src/ua/ua-rules'
import { Tier } from '../src/types'

describe('buildUaRules', () => {
  const rules = buildUaRules()

  it('produces rules at the UA tier', () => {
    expect(rules.length).toBeGreaterThan(0)
    expect(rules.every((r) => r.origin === Tier.UA)).toBe(true)
  })

  it('sets block display for p and inline for span', () => {
    const find = (sel: string) =>
      rules.filter((r) => r.match.kind === 'selector' && r.match.selector === sel)
    const pDisplay = find('p').flatMap((r) => r.declarations).find((d) => d.prop === 'display')
    const spanDisplay = find('span').flatMap((r) => r.declarations).find((d) => d.prop === 'display')
    expect(pDisplay?.value).toBe('block')
    expect(spanDisplay?.value).toBe('inline')
  })

  it('makes h1 bold via font-weight', () => {
    const h1 = rules.filter((r) => r.match.kind === 'selector' && r.match.selector === 'h1')
    const weight = h1.flatMap((r) => r.declarations).find((d) => d.prop === 'fontWeight')
    expect(weight?.value).toBe('bold')
  })

  it('assigns specificity and incrementing order', () => {
    expect(rules[0]!.specificity).toEqual([0, 0, 1])
    const orders = rules.map((r) => r.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/css/test/ua-rules.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Author `packages/css/src/ua/ua-stylesheet.ts`**

```ts
/**
 * Built-in user-agent stylesheet, curated to the v1 tag set. Values mirror common
 * browser defaults, pragmatically adapted to RN. Margins use em so they scale with
 * font-size and resolve in the compute pass.
 */
export const UA_STYLESHEET = `
p { display: block; margin: 1em 0 }
div { display: block }
h1 { display: block; font-size: 2em; font-weight: bold; margin: 0.67em 0 }
h2 { display: block; font-size: 1.5em; font-weight: bold; margin: 0.83em 0 }
h3 { display: block; font-size: 1.17em; font-weight: bold; margin: 1em 0 }
h4 { display: block; font-weight: bold; margin: 1.33em 0 }
h5 { display: block; font-size: 0.83em; font-weight: bold; margin: 1.67em 0 }
h6 { display: block; font-size: 0.67em; font-weight: bold; margin: 2.33em 0 }
blockquote { display: block; margin: 1em 40px }
ul { display: block; margin: 1em 0; padding-left: 40px; list-style-type: disc }
ol { display: block; margin: 1em 0; padding-left: 40px; list-style-type: decimal }
li { display: list-item }
pre { display: block; font-family: monospace; white-space: pre; margin: 1em 0 }
hr { display: block; border-bottom-width: 1px; border-bottom-color: gray; margin: 0.5em 0 }
b { font-weight: bold }
strong { font-weight: bold }
i { font-style: italic }
em { font-style: italic }
u { text-decoration-line: underline }
s { text-decoration-line: line-through }
span { display: inline }
a { display: inline; text-decoration-line: underline; color: #0000ee }
code { font-family: monospace }
`
```

- [ ] **Step 4: Implement `packages/css/src/ua/ua-rules.ts`**

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/css/test/ua-rules.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/css/src/ua packages/css/test/ua-rules.test.ts
git commit -m "feat(css): add curated user-agent stylesheet"
```

---

## Task 11: Collect rules from all tiers (`collect/`)

**Files:**
- Create: `packages/css/src/collect/object-to-decls.ts`, `packages/css/src/collect/collect-rules.ts`
- Test: `packages/css/test/object-to-decls.test.ts`, `packages/css/test/collect-rules.test.ts`

`object-to-decls` converts a consumer `RNStyle` object (already RN longhand) into `RNDecl[]`. `collect-rules` assembles every tier into one `Rule[]` and pushes diagnostics (attaching `tier`/`selector`).

- [ ] **Step 1: Write the failing test for `object-to-decls`**

```ts
import { describe, expect, it } from 'vitest'
import { objectToDecls } from '../src/collect/object-to-decls'

describe('objectToDecls', () => {
  it('converts an RNStyle object to decls', () => {
    expect(objectToDecls({ color: 'red', fontSize: 14 })).toEqual([
      { prop: 'color', value: 'red', important: false },
      { prop: 'fontSize', value: 14, important: false },
    ])
  })

  it('skips undefined values', () => {
    expect(objectToDecls({ color: 'red', fontSize: undefined })).toEqual([
      { prop: 'color', value: 'red', important: false },
    ])
  })
})
```

- [ ] **Step 2: Run it — FAIL**, then implement `packages/css/src/collect/object-to-decls.ts`

```ts
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
```

Run: `pnpm exec vitest run packages/css/test/object-to-decls.test.ts` → PASS.

- [ ] **Step 3: Write the failing test for `collect-rules`**

```ts
import { describe, expect, it } from 'vitest'
import { parse } from '@yk-yong/rn-rich-text-dom'
import { collectRules } from '../src/collect/collect-rules'
import { Tier } from '../src/types'

describe('collectRules', () => {
  it('includes UA rules', () => {
    const doc = parse('<p>x</p>')
    const { rules } = collectRules(doc, {})
    expect(rules.some((r) => r.origin === Tier.UA)).toBe(true)
  })

  it('adds tagStyles, classStyles, and baseStyle tiers', () => {
    const doc = parse('<p class="note">x</p>')
    const { rules } = collectRules(doc, {
      baseStyle: { color: 'black' },
      tagStyles: { p: { color: 'green' } },
      classStyles: { note: { color: 'blue' } },
    })
    expect(rules.find((r) => r.origin === Tier.Base)?.match.kind).toBe('element')
    expect(rules.find((r) => r.origin === Tier.Tag)?.match).toEqual({ kind: 'tag', tag: 'p' })
    expect(rules.find((r) => r.origin === Tier.Class)?.match).toEqual({ kind: 'class', className: 'note' })
  })

  it('parses <style> blocks into author rules', () => {
    const doc = parse('<style>p { color: red }</style><p>x</p>')
    const { rules } = collectRules(doc, {})
    const styleRule = rules.find((r) => r.origin === Tier.Style)
    expect(styleRule?.match).toEqual({ kind: 'selector', selector: 'p' })
    expect(styleRule?.declarations[0]).toEqual({ prop: 'color', value: 'red', important: false })
  })

  it('parses inline style attributes into element-bound inline rules', () => {
    const doc = parse('<p style="color: red">x</p>')
    const { rules } = collectRules(doc, {})
    const inline = rules.find((r) => r.origin === Tier.Inline)
    expect(inline?.match.kind).toBe('element')
    expect(inline?.declarations[0]).toEqual({ prop: 'color', value: 'red', important: false })
  })

  it('collects diagnostics with tier + selector attached', () => {
    const doc = parse('<style>p { float: left }</style><p>x</p>')
    const { diagnostics } = collectRules(doc, {})
    expect(diagnostics).toContainEqual({
      property: 'float',
      value: 'left',
      reason: 'unknown-property',
      selector: 'p',
      tier: Tier.Style,
    })
  })
})
```

- [ ] **Step 4: Run it — FAIL**, then implement `packages/css/src/collect/collect-rules.ts`

```ts
import { getElementsByTagName, getText, isTag } from '@yk-yong/rn-rich-text-dom'
import type { Document, Element } from '@yk-yong/rn-rich-text-dom'
import { parseStylesheet } from '../parse/parse-stylesheet'
import { parseInline } from '../parse/parse-inline'
import { mapDeclaration } from '../mapping/map-declaration'
import { specificity } from '../specificity/specificity'
import { objectToDecls } from './object-to-decls'
import { buildUaRules } from '../ua/ua-rules'
import { Tier } from '../types'
import type { Diagnostic, ResolveOptions, Rule, Tier as TierT } from '../types'

interface Collector {
  rules: Rule[]
  diagnostics: Diagnostic[]
  order: number
}

function mapInto(
  raw: { property: string; value: string; important: boolean }[],
  tier: TierT,
  selector: string | undefined,
  diagnostics: Diagnostic[],
) {
  const decls = []
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
export function collectRules(doc: Document, options: ResolveOptions): { rules: Rule[]; diagnostics: Diagnostic[] } {
  const c: Collector = { rules: [...buildUaRules()], diagnostics: [], order: 1000 }

  // Tier 1: baseStyle — bound to each top-level element.
  if (options.baseStyle) {
    const decls = objectToDecls(options.baseStyle)
    for (const el of topLevelElements(doc)) {
      c.rules.push({ origin: Tier.Base, match: { kind: 'element', element: el }, specificity: [0, 0, 0], order: c.order++, declarations: decls })
    }
  }

  // Tier 2: tagStyles — keyed by tag.
  for (const [tag, style] of Object.entries(options.tagStyles ?? {})) {
    c.rules.push({ origin: Tier.Tag, match: { kind: 'tag', tag }, specificity: [0, 0, 1], order: c.order++, declarations: objectToDecls(style) })
  }

  // Tier 3: classStyles — keyed by class.
  for (const [className, style] of Object.entries(options.classStyles ?? {})) {
    c.rules.push({ origin: Tier.Class, match: { kind: 'class', className }, specificity: [0, 1, 0], order: c.order++, declarations: objectToDecls(style) })
  }

  // Tier 4: <style> blocks.
  for (const styleEl of getElementsByTagName('style', doc)) {
    for (const raw of parseStylesheet(getText(styleEl))) {
      const decls = mapInto(raw.declarations, Tier.Style, raw.selector, c.diagnostics)
      if (decls.length === 0) continue
      c.rules.push({ origin: Tier.Style, match: { kind: 'selector', selector: raw.selector }, specificity: specificity(raw.selector), order: c.order++, declarations: decls })
    }
  }

  // Tier 5: inline style attributes.
  for (const el of getElementsByTagName('*', doc)) {
    const styleAttr = el.attribs['style']
    if (!styleAttr) continue
    const decls = mapInto(parseInline(styleAttr), Tier.Inline, undefined, c.diagnostics)
    if (decls.length === 0) continue
    c.rules.push({ origin: Tier.Inline, match: { kind: 'element', element: el }, specificity: [1, 0, 0], order: c.order++, declarations: decls })
  }

  return { rules: c.rules, diagnostics: c.diagnostics }
}
```

- [ ] **Step 5: Run both test files to verify they pass**

Run: `pnpm exec vitest run packages/css/test/object-to-decls.test.ts packages/css/test/collect-rules.test.ts`
Expected: PASS. If `getElementsByTagName('*', doc)` does not return all elements, replace with `getElementsByTagType` from domutils or `findAll((el) => true, doc.children)` — verify against the dom package's exported helpers.

- [ ] **Step 6: Commit**

```bash
git add packages/css/src/collect packages/css/test/object-to-decls.test.ts packages/css/test/collect-rules.test.ts
git commit -m "feat(css): collect cascade rules from every tier"
```

---

## Task 12: Match rules to elements (`match/match-rules.ts`)

**Files:**
- Create: `packages/css/src/match/match-rules.ts`
- Test: `packages/css/test/match-rules.test.ts`

Maps each rule to the elements it applies to. Selector rules use css-select; tag/class/element rules use direct logic.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parse, getElementsByTagName } from '@yk-yong/rn-rich-text-dom'
import { matchRules } from '../src/match/match-rules'
import { Tier } from '../src/types'
import type { Rule } from '../src/types'

describe('matchRules', () => {
  it('matches a selector rule to descendant elements', () => {
    const doc = parse('<div><p>a</p><p>b</p></div>')
    const rule: Rule = { origin: Tier.Style, match: { kind: 'selector', selector: 'div > p' }, specificity: [0, 0, 2], order: 0, declarations: [] }
    const matched = matchRules(doc, [rule])
    const ps = getElementsByTagName('p', doc)
    expect(matched.get(ps[0]!)).toContain(rule)
    expect(matched.get(ps[1]!)).toContain(rule)
  })

  it('matches a tag rule by tag name', () => {
    const doc = parse('<p>a</p><span>b</span>')
    const rule: Rule = { origin: Tier.Tag, match: { kind: 'tag', tag: 'p' }, specificity: [0, 0, 1], order: 0, declarations: [] }
    const matched = matchRules(doc, [rule])
    const p = getElementsByTagName('p', doc)[0]!
    const span = getElementsByTagName('span', doc)[0]!
    expect(matched.get(p)).toContain(rule)
    expect(matched.get(span)).toBeUndefined()
  })

  it('matches a class rule by class token', () => {
    const doc = parse('<p class="a note">x</p>')
    const rule: Rule = { origin: Tier.Class, match: { kind: 'class', className: 'note' }, specificity: [0, 1, 0], order: 0, declarations: [] }
    const matched = matchRules(doc, [rule])
    const p = getElementsByTagName('p', doc)[0]!
    expect(matched.get(p)).toContain(rule)
  })

  it('matches an element-bound rule to exactly that element', () => {
    const doc = parse('<p>a</p><p>b</p>')
    const p0 = getElementsByTagName('p', doc)[0]!
    const rule: Rule = { origin: Tier.Inline, match: { kind: 'element', element: p0 }, specificity: [1, 0, 0], order: 0, declarations: [] }
    const matched = matchRules(doc, [rule])
    expect(matched.get(p0)).toContain(rule)
    expect(matched.get(getElementsByTagName('p', doc)[1]!)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it — FAIL**, then implement `packages/css/src/match/match-rules.ts`

```ts
import { selectAll } from 'css-select'
import { getElementsByTagName, getAttributeValue } from '@yk-yong/rn-rich-text-dom'
import type { Document, Element } from '@yk-yong/rn-rich-text-dom'
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
        for (const el of selectAll(m.selector, doc) as Element[]) add(el, rule)
        break
      case 'tag':
        for (const el of getElementsByTagName(m.tag, doc)) add(el, rule)
        break
      case 'class':
        for (const el of getElementsByTagName('*', doc)) {
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
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm exec vitest run packages/css/test/match-rules.test.ts`
Expected: PASS (4 tests). `selectAll` from css-select uses domutils as its default adapter, so it accepts the domhandler `Document` directly.

- [ ] **Step 4: Commit**

```bash
git add packages/css/src/match/match-rules.ts packages/css/test/match-rules.test.ts
git commit -m "feat(css): match rules to elements via css-select and tiers"
```

---

## Task 13: Cascade (`cascade/cascade.ts`)

**Files:**
- Create: `packages/css/src/cascade/cascade.ts`
- Test: `packages/css/test/cascade.test.ts`

Reduces one element's matched rules to a winner per `TargetProp`. Output: `SpecifiedStyle = Map<TargetProp, { value: DeclValue; important: boolean }>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { cascade } from '../src/cascade/cascade'
import { Tier } from '../src/types'
import type { Rule } from '../src/types'

const rule = (origin: number, spec: [number, number, number], order: number, prop: string, value: unknown, important = false): Rule => ({
  origin: origin as Rule['origin'],
  match: { kind: 'tag', tag: 'p' },
  specificity: spec,
  order,
  declarations: [{ prop: prop as never, value: value as never, important }],
})

describe('cascade', () => {
  it('higher tier wins regardless of specificity', () => {
    const out = cascade([
      rule(Tier.Style, [1, 0, 0], 0, 'color', 'red'), // high specificity, lower tier? no — style is tier 4
      rule(Tier.Inline, [0, 0, 0], 1, 'color', 'blue'), // inline tier 5 wins
    ])
    expect(out.get('color')?.value).toBe('blue')
  })

  it('within a tier, higher specificity wins', () => {
    const out = cascade([
      rule(Tier.Style, [0, 0, 1], 0, 'color', 'red'),
      rule(Tier.Style, [0, 1, 0], 1, 'color', 'green'),
    ])
    expect(out.get('color')?.value).toBe('green')
  })

  it('within equal specificity, later source order wins', () => {
    const out = cascade([
      rule(Tier.Style, [0, 0, 1], 0, 'color', 'red'),
      rule(Tier.Style, [0, 0, 1], 1, 'color', 'green'),
    ])
    expect(out.get('color')?.value).toBe('green')
  })

  it('!important beats everything below it', () => {
    const out = cascade([
      rule(Tier.Inline, [1, 0, 0], 5, 'color', 'blue'),
      rule(Tier.Style, [0, 0, 1], 0, 'color', 'red', true),
    ])
    expect(out.get('color')?.value).toBe('red')
  })

  it('keeps independent props', () => {
    const out = cascade([
      rule(Tier.Style, [0, 0, 1], 0, 'color', 'red'),
      rule(Tier.Style, [0, 0, 1], 1, 'fontSize', 12),
    ])
    expect(out.get('color')?.value).toBe('red')
    expect(out.get('fontSize')?.value).toBe(12)
  })
})
```

- [ ] **Step 2: Run it — FAIL**, then implement `packages/css/src/cascade/cascade.ts`

```ts
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
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm exec vitest run packages/css/test/cascade.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 4: Commit**

```bash
git add packages/css/src/cascade/cascade.ts packages/css/test/cascade.test.ts
git commit -m "feat(css): cascade matched declarations to a specified style"
```

---

## Task 14: Compute an element (`resolve/compute-element.ts`)

**Files:**
- Create: `packages/css/src/resolve/compute-element.ts`
- Test: `packages/css/test/compute-element.test.ts`

Turns a `SpecifiedStyle` + the parent's `ComputedStyle` into this element's `ComputedStyle`: seed inherited props from the parent, resolve `fontSize` first, then resolve the rest (including deferred units) against the font context, routing each prop to `style` or `control`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { computeElement, ROOT_PARENT } from '../src/resolve/compute-element'
import type { ComputedStyle, DeferredLength } from '../src/types'
import type { SpecifiedStyle } from '../src/cascade/cascade'

const root = (fontSize: number): ComputedStyle => ({ ...ROOT_PARENT, style: { ...ROOT_PARENT.style, fontSize } })
const spec = (entries: [string, unknown][]): SpecifiedStyle =>
  new Map(entries.map(([p, v]) => [p as never, { value: v as never, important: false }]))

describe('computeElement', () => {
  it('inherits color and font-size from the parent', () => {
    const parent = root(16)
    parent.style.color = 'blue'
    const out = computeElement(spec([]), parent, 16)
    expect(out.style.color).toBe('blue')
    expect(out.style.fontSize).toBe(16)
  })

  it('does not inherit non-inherited props like margin', () => {
    const parent = root(16)
    parent.style.marginTop = 10
    const out = computeElement(spec([]), parent, 16)
    expect(out.style.marginTop).toBeUndefined()
  })

  it('resolves an em font-size against the parent font-size', () => {
    const fs: DeferredLength = { kind: 'deferred-length', unit: 'em', number: 2, prop: 'fontSize' }
    const out = computeElement(spec([['fontSize', fs]]), root(16), 16)
    expect(out.style.fontSize).toBe(32)
  })

  it('resolves an em margin against the element own font-size', () => {
    const fs: DeferredLength = { kind: 'deferred-length', unit: 'em', number: 2, prop: 'fontSize' }
    const mt: DeferredLength = { kind: 'deferred-length', unit: 'em', number: 1, prop: 'marginTop' }
    const out = computeElement(spec([['fontSize', fs], ['marginTop', mt]]), root(16), 16)
    expect(out.style.fontSize).toBe(32)
    expect(out.style.marginTop).toBe(32) // 1em * own 32
  })

  it('routes control props to control, not style', () => {
    const out = computeElement(spec([['display', 'block']]), root(16), 16)
    expect(out.control.display).toBe('block')
    expect((out.style as Record<string, unknown>)['display']).toBeUndefined()
  })

  it('passes a layout % through as a string', () => {
    const out = computeElement(spec([['width', '50%']]), root(16), 16)
    expect(out.style.width).toBe('50%')
  })
})
```

- [ ] **Step 2: Run it — FAIL**, then implement `packages/css/src/resolve/compute-element.ts`

```ts
import { isInherited } from '../inherit/inherited'
import { resolveDeferred } from '../units/resolve-deferred'
import type { ComputedStyle, ControlProp, ControlStyle, DeclValue, DeferredLength, RNStyle, TargetProp } from '../types'
import type { SpecifiedStyle } from '../cascade/cascade'

/** Synthetic parent for the document roots: CSS initial inherited values. */
export const ROOT_PARENT: ComputedStyle = {
  style: { color: '#000000', fontSize: 16 },
  control: { display: 'block', whiteSpace: 'normal' },
}

const CONTROL_PROPS = new Set<string>(['display', 'whiteSpace', 'listStyleType', 'listStylePosition'])
const isControl = (p: TargetProp): p is ControlProp => CONTROL_PROPS.has(p)
const isDeferred = (v: DeclValue): v is DeferredLength =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && (v as DeferredLength).kind === 'deferred-length'

/** Compute one element's style from its specified style and the parent's computed style. */
export function computeElement(specified: SpecifiedStyle, parent: ComputedStyle, rootFontSize: number): ComputedStyle {
  const style: RNStyle = {}
  const control: ControlStyle = { display: 'inline', whiteSpace: 'normal' }

  // 1. Seed inherited props from the parent.
  for (const prop of Object.keys(parent.style) as (keyof RNStyle)[]) {
    if (isInherited(prop)) (style as Record<string, unknown>)[prop] = parent.style[prop]
  }
  for (const prop of Object.keys(parent.control) as ControlProp[]) {
    if (isInherited(prop) && parent.control[prop] !== undefined) {
      ;(control as Record<string, unknown>)[prop] = parent.control[prop]
    }
  }

  const parentFontSize = parent.style.fontSize ?? rootFontSize

  // 2. Resolve fontSize first (em/% on font-size use the parent font-size).
  const fsEntry = specified.get('fontSize')
  let ownFontSize = style.fontSize ?? parentFontSize
  if (fsEntry) {
    const v = fsEntry.value
    ownFontSize = isDeferred(v) ? resolveDeferred(v, { ownFontSize: parentFontSize, parentFontSize, rootFontSize }) : (v as number)
  }
  style.fontSize = ownFontSize

  // 3. Resolve everything else against the own font-size.
  const ctx = { ownFontSize, parentFontSize, rootFontSize }
  for (const [prop, entry] of specified) {
    if (prop === 'fontSize') continue
    const value = isDeferred(entry.value) ? resolveDeferred(entry.value, ctx) : entry.value
    if (isControl(prop)) (control as Record<string, unknown>)[prop] = value
    else (style as Record<string, unknown>)[prop] = value
  }

  return { style, control }
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm exec vitest run packages/css/test/compute-element.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 4: Commit**

```bash
git add packages/css/src/resolve/compute-element.ts packages/css/test/compute-element.test.ts
git commit -m "feat(css): compute per-element style with inheritance and units"
```

---

## Task 15: Orchestrator `resolveStyles` (`resolve/resolve-styles.ts`) + public barrel

**Files:**
- Create: `packages/css/src/resolve/resolve-styles.ts`
- Modify: `packages/css/src/index.ts`
- Test: `packages/css/test/resolve-styles.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parse, getElementsByTagName } from '@yk-yong/rn-rich-text-dom'
import { resolveStyles } from '../src/resolve/resolve-styles'

describe('resolveStyles', () => {
  it('computes UA defaults (p is block with em margins resolved)', () => {
    const doc = parse('<p>hello</p>')
    const { styles } = resolveStyles(doc)
    const p = getElementsByTagName('p', doc)[0]!
    const cs = styles.get(p)!
    expect(cs.control.display).toBe('block')
    expect(cs.style.marginTop).toBe(16) // 1em * 16
  })

  it('inherits color from a parent through the tree', () => {
    const doc = parse('<div style="color: red"><p><span>x</span></p></div>')
    const { styles } = resolveStyles(doc)
    const span = getElementsByTagName('span', doc)[0]!
    expect(styles.get(span)!.style.color).toBe('red')
  })

  it('applies the cascade: inline beats <style> beats tagStyles beats UA', () => {
    const doc = parse('<style>p { color: green }</style><p style="color: blue">x</p>')
    const { styles } = resolveStyles(doc, { tagStyles: { p: { color: 'orange' } } })
    const p = getElementsByTagName('p', doc)[0]!
    expect(styles.get(p)!.style.color).toBe('blue')
  })

  it('resolves h1 font-size (2em) against the root font-size', () => {
    const doc = parse('<h1>title</h1>')
    const { styles } = resolveStyles(doc, { rootFontSize: 10 })
    const h1 = getElementsByTagName('h1', doc)[0]!
    expect(styles.get(h1)!.style.fontSize).toBe(20)
  })

  it('returns empty diagnostics unless collectDiagnostics is set', () => {
    const doc = parse('<p style="float: left">x</p>')
    expect(resolveStyles(doc).diagnostics).toEqual([])
    const withDiag = resolveStyles(doc, { collectDiagnostics: true })
    expect(withDiag.diagnostics.some((d) => d.property === 'float')).toBe(true)
  })

  it('applies baseStyle to roots and inherits it down', () => {
    const doc = parse('<p><span>x</span></p>')
    const { styles } = resolveStyles(doc, { baseStyle: { color: '#123456' } })
    const span = getElementsByTagName('span', doc)[0]!
    expect(styles.get(span)!.style.color).toBe('#123456')
  })
})
```

- [ ] **Step 2: Run it — FAIL**, then implement `packages/css/src/resolve/resolve-styles.ts`

```ts
import { isTag } from '@yk-yong/rn-rich-text-dom'
import type { Document, Element } from '@yk-yong/rn-rich-text-dom'
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
```

Note: `rootFontSize` is threaded into options but `ResolveOptions.rootFontSize` already exists, so no type change is needed.

- [ ] **Step 3: Implement the public barrel `packages/css/src/index.ts`**

```ts
export { resolveStyles } from './resolve/resolve-styles'
export type {
  RNStyle,
  RNStyleProp,
  ControlStyle,
  ComputedStyle,
  ResolveOptions,
  ResolveResult,
  Diagnostic,
  DiagnosticReason,
} from './types'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/css/test/resolve-styles.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck the whole package**

Run: `pnpm --filter @yk-yong/rn-rich-text-css typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/css/src/resolve/resolve-styles.ts packages/css/src/index.ts packages/css/test/resolve-styles.test.ts
git commit -m "feat(css): add resolveStyles orchestrator and public API"
```

---

## Task 16: Integration fixtures (`test/fixtures/`)

**Files:**
- Create: `packages/css/test/fixtures/article.html`, `packages/css/test/integration.test.ts`

End-to-end assertions over realistic CMS-style markup, the corpus the spec requires.

- [ ] **Step 1: Create `packages/css/test/fixtures/article.html`**

```html
<style>
  .lead { font-size: 1.25em; color: #333333 }
  blockquote { color: #666666 }
</style>
<article>
  <h1>Heading</h1>
  <p class="lead">Intro paragraph with <strong>bold</strong> and <em>italic</em>.</p>
  <p>Body with a <a href="https://example.com">link</a>.</p>
  <ul>
    <li>one</li>
    <li>two</li>
  </ul>
  <blockquote>A quote.</blockquote>
</article>
```

- [ ] **Step 2: Write the integration test** — `packages/css/test/integration.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse, getElementsByTagName, findOne, isTag } from '@yk-yong/rn-rich-text-dom'
import { resolveStyles } from '../src'

const html = readFileSync(fileURLToPath(new URL('./fixtures/article.html', import.meta.url)), 'utf8')

describe('integration: article.html', () => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc, { baseStyle: { color: '#000000', fontSize: 16 } })
  const byTag = (t: string) => getElementsByTagName(t, doc)

  it('h1 is block, bold, 2em resolved to 32', () => {
    const cs = styles.get(byTag('h1')[0]!)!
    expect(cs.control.display).toBe('block')
    expect(cs.style.fontWeight).toBe('bold')
    expect(cs.style.fontSize).toBe(32)
  })

  it('.lead paragraph gets class font-size (1.25em -> 20) and color', () => {
    const lead = findOne((n) => isTag(n) && n.attribs['class'] === 'lead', doc.children, true)!
    const cs = styles.get(lead)!
    expect(cs.style.fontSize).toBe(20)
    expect(cs.style.color).toBe('#333333')
  })

  it('strong inside .lead inherits the 20px font-size and is bold', () => {
    const strong = byTag('strong')[0]!
    const cs = styles.get(strong)!
    expect(cs.style.fontSize).toBe(20)
    expect(cs.style.fontWeight).toBe('bold')
  })

  it('a is underlined and inline', () => {
    const cs = styles.get(byTag('a')[0]!)!
    expect(cs.control.display).toBe('inline')
    expect(cs.style.textDecorationLine).toBe('underline')
  })

  it('li elements are list-item', () => {
    expect(styles.get(byTag('li')[0]!)!.control.display).toBe('list-item')
  })

  it('blockquote color comes from the <style> block', () => {
    expect(styles.get(byTag('blockquote')[0]!)!.style.color).toBe('#666666')
  })
})
```

- [ ] **Step 3: Run the integration test**

Run: `pnpm exec vitest run packages/css/test/integration.test.ts`
Expected: PASS (6 tests). If `findOne`'s signature differs, select `.lead` via `getElementsByTagName('p', doc)` and filter by `attribs.class === 'lead'`.

- [ ] **Step 4: Commit**

```bash
git add packages/css/test/fixtures packages/css/test/integration.test.ts
git commit -m "test(css): add end-to-end article fixture integration test"
```

---

## Task 17: Changeset, full build, and green gate

**Files:**
- Create: `.changeset/<name>.md`

- [ ] **Step 1: Add a changeset** — create `.changeset/phase-1-css-engine.md`

```md
---
'@yk-yong/rn-rich-text-css': minor
---

Add the CSS engine: `resolveStyles(document, options)` resolves a parsed DOM plus
consumer baseStyle/tagStyles/classStyles, `<style>` blocks, and inline styles into a
fully-computed RN style per element (cascade, specificity, inheritance, relative-unit
resolution, UA stylesheet), with optional diagnostics.
```

- [ ] **Step 2: Run the full workspace gate** (mirrors CI)

Run: `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all exit 0. The whole `packages/css` test suite is green and the package builds ESM + CJS + declarations (via `tsc -b`).

- [ ] **Step 3: Fix any lint/format issues**

Run: `pnpm format && pnpm lint`
Expected: exit 0. Re-run `pnpm test` if formatting touched files.

- [ ] **Step 4: Commit**

```bash
git add .changeset packages/css pnpm-lock.yaml
git commit -m "chore(css): add changeset for the Phase 1 CSS engine"
```

- [ ] **Step 5: Push and open the PR**

```bash
git push -u origin phase-1-css-engine
gh pr create --title "Phase 1: @scope/css engine" --body "Implements the Phase 1 CSS engine per docs/specs/2026-06-12-phase-1-css-engine-design.md."
```

---

## Self-Review (completed during planning)

**1. Spec coverage** — every spec section maps to a task:
- Module decomposition → Tasks 0–15 (one module per task).
- Data model (`RNDecl`, `Rule`, `ComputedStyle.control`, `Diagnostic`) → Task 1.
- Cascade tiers + `baseStyle` root-only + `!important` + selectors → Tasks 11 (tiers), 12 (selector match), 13 (cascade incl. `!important`).
- Inheritance set + root seeding → Tasks 9, 14.
- Relative-unit resolution (`em`/`rem`/`%`/`pt`*/unitless) → Tasks 6, 8, 14. *Note: `pt` is folded into the curated whitelist path via css-to-react-native where supported; the deferred path covers `em`/`rem`/`%`/unitless. If `pt` needs explicit handling, extend `parseToken` in Task 6 with a `pt -> *96/72` branch.
- Mapping + whitelist + diagnostics → Tasks 5, 7, 11.
- Public API → Task 15. Testing strategy (unit per module + fixtures) → every task + Task 16.
- Out-of-scope items (`@media`, `var()`, `calc()`) → skipped/diagnosed (Tasks 4 skips at-rules; Task 7 emits `unsupported-value` for `calc()`).

**2. Placeholder scan** — no `TBD`/`TODO`/"handle edge cases"; every code step shows real code and exact commands.

**3. Type consistency** — `RNDecl`, `TargetProp`, `Rule.match`, `SpecifiedStyle`, `ComputedStyle`, `FontContext`, and `DeferredLength` signatures are defined in Tasks 1/8/13 and used identically downstream. `Tier` is both a type and a const-object of named tiers (Task 1), used by name (`Tier.UA`…) everywhere.

**One gap fixed inline:** `pt` handling is noted under Spec coverage above (extend `parseToken` if css-to-react-native does not cover it in practice — verify during Task 6).

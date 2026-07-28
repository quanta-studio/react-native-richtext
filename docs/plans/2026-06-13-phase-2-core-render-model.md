# Phase 2a: `@scope/core` Render-Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@quanta-studio/react-native-richtext-core` — a React-free package whose `buildRenderTree(document, styles)` turns a parsed DOM plus the css `Map<Element, ComputedStyle>` into a renderer-agnostic styled tree (block/inline split, whitespace-collapsed + entity-decoded text, basic list markers).

**Architecture:** Approach B — a staged pipeline `split → processText → annotateMarkers`. `split` does the block/inline structural transform (the "no `<View>` inside `<Text>`" rule, driven by computed `display`), wrapping each maximal run of inline content in an anonymous `InlineContainerNode`. `processText` decodes entities then collapses whitespace per the container's `white-space`, dropping empties. `annotateMarkers` numbers `li`s. Each element node carries `style` + `control` (mirroring css's `ComputedStyle`); the model is mutated in place across stages.

**Tech Stack:** TypeScript 6 (strict, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`), Vitest 4, tsup, pnpm. New dep: `entities`. Workspace deps: `@quanta-studio/react-native-richtext-dom`, `@quanta-studio/react-native-richtext-css`.

**Reference:** spec at `docs/specs/2026-06-13-phase-2-core-render-model-design.md`. Mirror `packages/css` for all config.

**Refinement of the spec (decided at planning time):** element nodes (`BlockNode`, `InlineNode`) carry the full computed `control: ControlStyle` alongside `style: RNStyle` — consistent with css's `ComputedStyle` and needed so `annotateMarkers` can read each `li`'s `listStyleType` from the tree. `InlineContainerNode` carries `whiteSpace` (its owner block's) so `processText` knows the collapse mode.

---

## File Structure

```
packages/core/
  package.json, tsconfig.json, tsconfig.test.json, tsup.config.ts, README.md, LICENSE
  src/
    index.ts            # barrel: buildRenderTree + node types
    types.ts            # RenderNode union + node interfaces + ListMarker + WhiteSpace
    classify.ts         # display/level/hidden/non-rendered predicates
    split.ts            # structural transform: Document + styles -> tree (raw text)
    text/
      decode.ts         # entity decode wrapper (entities.decodeHTML)
      collapse.ts       # whitespace collapse over a flat leaf array, by white-space mode
      process-text.ts   # walk tree: decode + collapse each container, drop empties
    markers.ts          # annotate li nodes with ListMarker
    build.ts            # buildRenderTree = split -> processText -> annotateMarkers
  test/
    *.test.ts           # one per module + integration/fixtures
```

Run one test file: `pnpm exec vitest run packages/core/test/<name>.test.ts`
Typecheck the package: `pnpm --filter @quanta-studio/react-native-richtext-core typecheck`

---

## Task 0: Scaffold `@quanta-studio/react-native-richtext-core`

**Files:**

- Create: `packages/core/{package.json,tsconfig.json,tsconfig.test.json,tsup.config.ts,README.md,LICENSE,src/index.ts}`
- Modify: root `tsconfig.json` (add reference), root `vitest.config.ts` (add css alias)

- [ ] **Step 1: `packages/core/package.json`** (mirror css; deps added via pnpm in Step 7)

```json
{
  "name": "@quanta-studio/react-native-richtext-core",
  "version": "0.0.0",
  "description": "Render-model builder for react-native-richtext: DOM + computed styles -> renderer-agnostic styled tree. React-free.",
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
  "scripts": { "build": "tsup", "typecheck": "tsc -p tsconfig.test.json", "clean": "rimraf dist" },
  "publishConfig": { "access": "public" },
  "keywords": ["html", "react-native", "rich-text", "render-tree"]
}
```

- [ ] **Step 2: `packages/core/tsconfig.json`** (references BOTH dom and css)

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
  "references": [{ "path": "../dom" }, { "path": "../css" }]
}
```

- [ ] **Step 3: `packages/core/tsconfig.test.json`** (source `paths` for BOTH workspace deps)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": false,
    "noEmit": true,
    "types": ["node"],
    "paths": {
      "@quanta-studio/react-native-richtext-dom": ["../dom/src/index.ts"],
      "@quanta-studio/react-native-richtext-css": ["../css/src/index.ts"]
    }
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 4: `packages/core/tsup.config.ts`** (identical to css's), `README.md`, copy `LICENSE`

`packages/core/tsup.config.ts`:

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

`packages/core/README.md`:

```md
# @quanta-studio/react-native-richtext-core

Render-model builder for react-native-richtext: turns a parsed DOM + per-element computed
styles into a renderer-agnostic styled tree (block/inline split, whitespace
collapse, entity decode, list markers). React-free pure logic.

Not yet published — internal to the react-native-richtext monorepo.
```

Copy license: `cp packages/dom/LICENSE packages/core/LICENSE`

- [ ] **Step 5: root `tsconfig.json`** — add the core reference:

```json
{
  "files": [],
  "references": [
    { "path": "packages/dom" },
    { "path": "packages/css" },
    { "path": "packages/core" }
  ]
}
```

- [ ] **Step 6: root `vitest.config.ts`** — add the css alias next to the existing dom alias so core's tests resolve css to source:

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Resolve workspace packages to their source so tests run without a prior build.
  resolve: {
    alias: {
      '@quanta-studio/react-native-richtext-dom': fileURLToPath(
        new URL('./packages/dom/src/index.ts', import.meta.url),
      ),
      '@quanta-studio/react-native-richtext-css': fileURLToPath(
        new URL('./packages/css/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/index.ts', '**/types.ts'],
    },
  },
})
```

- [ ] **Step 7: Add dependencies via pnpm** (resolves valid versions, writes package.json + lockfile)

```bash
pnpm --filter @quanta-studio/react-native-richtext-core add @quanta-studio/react-native-richtext-dom@workspace:* @quanta-studio/react-native-richtext-css@workspace:* entities
pnpm --filter @quanta-studio/react-native-richtext-core add -D @types/node
```

- [ ] **Step 8: Placeholder `packages/core/src/index.ts`**

```ts
export {}
```

- [ ] **Step 9: Verify install + build + typecheck**

Run: `pnpm install && pnpm --filter @quanta-studio/react-native-richtext-core typecheck && pnpm --filter @quanta-studio/react-native-richtext-core build`
Expected: exit 0; `packages/core/dist/index.js` + `index.cjs` produced.

- [ ] **Step 10: Commit**

```bash
git add packages/core tsconfig.json vitest.config.ts package.json pnpm-lock.yaml
git commit -m "chore(core): scaffold @quanta-studio/react-native-richtext-core package"
```

---

## Task 1: Core types (`types.ts`)

**Files:** Create `packages/core/src/types.ts`; Test `packages/core/test/types.test.ts`

- [ ] **Step 1: Write the failing test** — `packages/core/test/types.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import type {
  RenderNode,
  BlockNode,
  InlineContainerNode,
  InlineNode,
  TextNode,
  LineBreakNode,
  ListMarker,
} from '../src/types'

describe('types', () => {
  it('constructs the node variants', () => {
    const text: TextNode = { type: 'text', text: 'hi', key: '0' }
    const br: LineBreakNode = { type: 'linebreak', key: '1' }
    const inline: InlineNode = {
      type: 'inline',
      tag: 'b',
      style: { fontWeight: 'bold' },
      control: { display: 'inline', whiteSpace: 'normal' },
      attribs: {},
      children: [text],
      key: '0.0',
    }
    const container: InlineContainerNode = {
      type: 'inline-container',
      style: {},
      whiteSpace: 'normal',
      children: [inline, br],
      key: '0',
    }
    const marker: ListMarker = { ordered: false, index: 1, listStyleType: 'disc', text: '•' }
    const block: BlockNode = {
      type: 'block',
      tag: 'li',
      style: {},
      control: { display: 'list-item', whiteSpace: 'normal' },
      attribs: {},
      marker,
      children: [container],
      key: '0',
    }
    const nodes: RenderNode[] = [block, container, inline, text, br]
    expect(nodes.map((n) => n.type)).toEqual([
      'block',
      'inline-container',
      'inline',
      'text',
      'linebreak',
    ])
  })
})
```

- [ ] **Step 2: Run → FAIL** (`pnpm exec vitest run packages/core/test/types.test.ts`)

- [ ] **Step 3: Implement `packages/core/src/types.ts`**

```ts
import type { RNStyle, ControlStyle } from '@quanta-studio/react-native-richtext-css'

export type { RNStyle, ControlStyle }
export type WhiteSpace = ControlStyle['whiteSpace']

export interface ListMarker {
  ordered: boolean
  index: number
  listStyleType: string
  text: string
}

export interface BlockNode {
  type: 'block'
  tag: string
  style: RNStyle
  control: ControlStyle
  attribs: Record<string, string>
  marker?: ListMarker
  children: Array<BlockNode | InlineContainerNode>
  key: string
}

export interface InlineContainerNode {
  type: 'inline-container'
  style: RNStyle
  whiteSpace: WhiteSpace
  children: InlineChild[]
  key: string
}

export interface InlineNode {
  type: 'inline'
  tag: string
  style: RNStyle
  control: ControlStyle
  attribs: Record<string, string>
  children: InlineChild[]
  key: string
}

export interface TextNode {
  type: 'text'
  text: string
  key: string
}

export interface LineBreakNode {
  type: 'linebreak'
  key: string
}

export type InlineChild = InlineNode | TextNode | LineBreakNode
export type BlockChild = BlockNode | InlineContainerNode
export type RenderNode = BlockNode | InlineContainerNode | InlineNode | TextNode | LineBreakNode
```

- [ ] **Step 4: Run → PASS**, then typecheck (`pnpm --filter @quanta-studio/react-native-richtext-core typecheck`) → clean.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/test/types.test.ts
git commit -m "feat(core): add render-model type definitions"
```

---

## Task 2: Classification predicates (`classify.ts`)

**Files:** Create `packages/core/src/classify.ts`; Test `packages/core/test/classify.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parse, getElementsByTagName } from '@quanta-studio/react-native-richtext-dom'
import { resolveStyles } from '@quanta-studio/react-native-richtext-css'
import { isBlockLevel, isInlineLevel, isHidden, isNonRendered, displayOf } from '../src/classify'

describe('classify', () => {
  it('classifies display levels', () => {
    expect(isBlockLevel('block')).toBe(true)
    expect(isBlockLevel('list-item')).toBe(true)
    expect(isBlockLevel('inline')).toBe(false)
    expect(isInlineLevel('inline')).toBe(true)
    expect(isInlineLevel('inline-block')).toBe(true)
    expect(isInlineLevel('block')).toBe(false)
    expect(isInlineLevel('none')).toBe(false)
  })

  it('flags non-rendered tags', () => {
    expect(isNonRendered('style')).toBe(true)
    expect(isNonRendered('script')).toBe(true)
    expect(isNonRendered('p')).toBe(false)
  })

  it('reads computed display and hidden from the styles map', () => {
    const doc = parse('<p>x</p><span>y</span>')
    const { styles } = resolveStyles(doc)
    const p = getElementsByTagName('p', doc)[0]!
    const span = getElementsByTagName('span', doc)[0]!
    expect(displayOf(p, styles)).toBe('block')
    expect(displayOf(span, styles)).toBe('inline')
    expect(isHidden(p, styles)).toBe(false)
  })

  it('treats display:none as hidden', () => {
    const doc = parse('<p style="display:none">x</p>')
    const { styles } = resolveStyles(doc)
    const p = getElementsByTagName('p', doc)[0]!
    expect(isHidden(p, styles)).toBe(true)
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/core/src/classify.ts`**

```ts
import type { Element } from '@quanta-studio/react-native-richtext-dom'
import type { ComputedStyle } from '@quanta-studio/react-native-richtext-css'

export type Display = ComputedStyle['control']['display']

const NON_RENDERED = new Set<string>([
  'head',
  'style',
  'script',
  'title',
  'meta',
  'link',
  'base',
  'noscript',
])

export function isNonRendered(tag: string): boolean {
  return NON_RENDERED.has(tag)
}

export function displayOf(el: Element, styles: Map<Element, ComputedStyle>): Display {
  return styles.get(el)?.control.display ?? 'inline'
}

export function isHidden(el: Element, styles: Map<Element, ComputedStyle>): boolean {
  return displayOf(el, styles) === 'none'
}

export function isBlockLevel(display: Display): boolean {
  return display === 'block' || display === 'list-item'
}

export function isInlineLevel(display: Display): boolean {
  return display !== 'none' && !isBlockLevel(display)
}
```

- [ ] **Step 4: Run → PASS**; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/classify.ts packages/core/test/classify.test.ts
git commit -m "feat(core): add display classification predicates"
```

---

## Task 3: Structural split (`split.ts`)

**Files:** Create `packages/core/src/split.ts`; Test `packages/core/test/split.test.ts`

This builds the tree with RAW (undecoded, uncollapsed) text — Stage 3 cleans the text later.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parse } from '@quanta-studio/react-native-richtext-dom'
import { resolveStyles } from '@quanta-studio/react-native-richtext-css'
import { splitDocument } from '../src/split'
import type { BlockNode, InlineContainerNode, InlineNode } from '../src/types'

const build = (html: string) => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc)
  return splitDocument(doc, styles)
}

describe('splitDocument', () => {
  it('wraps a block of only inline content in one inline-container', () => {
    const tree = build('<p>hello <b>world</b></p>')
    expect(tree).toHaveLength(1)
    const p = tree[0] as BlockNode
    expect(p.type).toBe('block')
    expect(p.tag).toBe('p')
    expect(p.children).toHaveLength(1)
    const ic = p.children[0] as InlineContainerNode
    expect(ic.type).toBe('inline-container')
    // raw text node "hello " + inline <b> with text "world"
    expect(ic.children[0]).toMatchObject({ type: 'text', text: 'hello ' })
    expect(ic.children[1]).toMatchObject({ type: 'inline', tag: 'b' })
  })

  it('flushes inline runs around block children', () => {
    const tree = build('<div>before<p>mid</p>after</div>')
    const div = tree[0] as BlockNode
    expect(div.children.map((c) => c.type)).toEqual([
      'inline-container',
      'block',
      'inline-container',
    ])
    expect((div.children[1] as BlockNode).tag).toBe('p')
  })

  it('maps <br> to a linebreak node', () => {
    const tree = build('<p>a<br>b</p>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    expect(ic.children.map((c) => c.type)).toEqual(['text', 'linebreak', 'text'])
  })

  it('preserves href on <a> attribs', () => {
    const tree = build('<p><a href="https://x.com">link</a></p>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    const a = ic.children[0] as InlineNode
    expect(a.tag).toBe('a')
    expect(a.attribs.href).toBe('https://x.com')
  })

  it('drops display:none and non-rendered tags', () => {
    const tree = build('<style>p{}</style><p>x</p><span style="display:none">y</span>')
    // only the <p> block survives at top level (span hidden, style non-rendered)
    expect(tree).toHaveLength(1)
    expect((tree[0] as BlockNode).tag).toBe('p')
  })

  it('groups top-level inline content into an inline-container', () => {
    const tree = build('<b>hi</b>')
    expect(tree).toHaveLength(1)
    expect(tree[0]!.type).toBe('inline-container')
  })

  it('assigns deterministic path keys', () => {
    const tree = build('<div><p>a</p></div>')
    const div = tree[0] as BlockNode
    expect(div.key).toBe('0')
    expect((div.children[0] as BlockNode).key).toBe('0.0')
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/core/src/split.ts`**

```ts
import { isTag, isText } from '@quanta-studio/react-native-richtext-dom'
import type { AnyNode, Document, Element } from '@quanta-studio/react-native-richtext-dom'
import type { ComputedStyle } from '@quanta-studio/react-native-richtext-css'
import { displayOf, isBlockLevel, isHidden, isNonRendered } from './classify'
import type {
  BlockChild,
  BlockNode,
  ControlStyle,
  InlineChild,
  InlineContainerNode,
  InlineNode,
  LineBreakNode,
  RNStyle,
  WhiteSpace,
} from './types'

const EMPTY_STYLE: RNStyle = {}
const DEFAULT_CONTROL: ControlStyle = { display: 'inline', whiteSpace: 'normal' }

type Styles = Map<Element, ComputedStyle>

const childKey = (prefix: string, i: number): string => (prefix === '' ? `${i}` : `${prefix}.${i}`)

/** Build the render tree from a document treated as a block context. */
export function splitDocument(document: Document, styles: Styles): BlockChild[] {
  return buildBlockContext(document.children, EMPTY_STYLE, 'normal', '', styles)
}

function buildBlockContext(
  nodes: AnyNode[],
  ownerStyle: RNStyle,
  ownerWhiteSpace: WhiteSpace,
  keyPrefix: string,
  styles: Styles,
): BlockChild[] {
  const result: BlockChild[] = []
  let run: InlineChild[] = []
  let runKey = ''

  const flush = () => {
    if (run.length > 0) {
      result.push({
        type: 'inline-container',
        style: ownerStyle,
        whiteSpace: ownerWhiteSpace,
        children: run,
        key: runKey,
      })
      run = []
    }
  }

  nodes.forEach((node, i) => {
    const key = childKey(keyPrefix, i)
    if (isText(node)) {
      if (run.length === 0) runKey = key
      run.push({ type: 'text', text: node.data, key })
      return
    }
    if (!isTag(node)) return // comments, directives, cdata
    if (isNonRendered(node.name) || isHidden(node, styles)) return
    if (isBlockLevel(displayOf(node, styles))) {
      flush()
      result.push(buildBlock(node, key, styles))
    } else {
      if (run.length === 0) runKey = key
      run.push(buildInline(node, key, styles))
    }
  })
  flush()
  return result
}

function buildBlock(el: Element, key: string, styles: Styles): BlockNode {
  const cs = styles.get(el)
  const style = cs?.style ?? EMPTY_STYLE
  const control = cs?.control ?? DEFAULT_CONTROL
  const children = buildBlockContext(el.children, style, control.whiteSpace, key, styles)
  return { type: 'block', tag: el.name, style, control, attribs: el.attribs, children, key }
}

function buildInline(el: Element, key: string, styles: Styles): InlineNode | LineBreakNode {
  if (el.name === 'br') return { type: 'linebreak', key }
  const cs = styles.get(el)
  const style = cs?.style ?? EMPTY_STYLE
  const control = cs?.control ?? DEFAULT_CONTROL
  const children = buildInlineChildren(el.children, key, styles)
  return { type: 'inline', tag: el.name, style, control, attribs: el.attribs, children, key }
}

function buildInlineChildren(nodes: AnyNode[], keyPrefix: string, styles: Styles): InlineChild[] {
  const result: InlineChild[] = []
  nodes.forEach((node, i) => {
    const key = childKey(keyPrefix, i)
    if (isText(node)) {
      result.push({ type: 'text', text: node.data, key })
      return
    }
    if (!isTag(node)) return
    if (isNonRendered(node.name) || isHidden(node, styles)) return
    // Inside an inline context every element is treated as inline (block-in-inline flattened).
    result.push(buildInline(node, key, styles))
  })
  return result
}
```

- [ ] **Step 4: Run → PASS** (7 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/split.ts packages/core/test/split.test.ts
git commit -m "feat(core): block/inline structural split"
```

---

## Task 4: Entity decode (`text/decode.ts`)

**Files:** Create `packages/core/src/text/decode.ts`; Test `packages/core/test/decode.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { decodeText } from '../src/text/decode'

describe('decodeText', () => {
  it('decodes named entities', () => {
    expect(decodeText('a &amp; b &lt;c&gt;')).toBe('a & b <c>')
  })
  it('decodes numeric entities', () => {
    expect(decodeText('&#169; &#x2014;')).toBe('© —')
  })
  it('decodes &nbsp; to U+00A0', () => {
    expect(decodeText('a&nbsp;b')).toBe('a b')
  })
  it('leaves plain text unchanged', () => {
    expect(decodeText('plain text')).toBe('plain text')
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/core/src/text/decode.ts`**

```ts
import { decodeHTML } from 'entities'

/** Decode HTML entities (named + numeric) in raw text. */
export function decodeText(raw: string): string {
  return decodeHTML(raw)
}
```

- [ ] **Step 4: Run → PASS**; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/text/decode.ts packages/core/test/decode.test.ts
git commit -m "feat(core): entity decoding via entities"
```

---

## Task 5: Whitespace collapse (`text/collapse.ts`)

**Files:** Create `packages/core/src/text/collapse.ts`; Test `packages/core/test/collapse.test.ts`

Operates on a flat array of inline leaves (text + linebreak), mutating `TextNode.text` in place.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { collapseLeaves } from '../src/text/collapse'
import type { TextNode, LineBreakNode } from '../src/types'

const t = (text: string, key = '0'): TextNode => ({ type: 'text', text, key })
const br = (): LineBreakNode => ({ type: 'linebreak', key: 'b' })

describe('collapseLeaves (normal)', () => {
  it('collapses internal whitespace runs to single spaces', () => {
    const leaves = [t('a   b\n\tc')]
    collapseLeaves(leaves, 'normal')
    expect(leaves[0]!.text).toBe('a b c')
  })

  it('trims leading and trailing whitespace at container edges', () => {
    const leaves = [t('   hello   ')]
    collapseLeaves(leaves, 'normal')
    expect(leaves[0]!.text).toBe('hello')
  })

  it('dedupes whitespace across leaf boundaries', () => {
    const leaves = [t('a '), t(' b')]
    collapseLeaves(leaves, 'normal')
    expect(leaves.map((l) => (l as TextNode).text)).toEqual(['a ', 'b'])
  })

  it('preserves U+00A0 (nbsp) as non-collapsible', () => {
    const leaves = [t('a  b')]
    collapseLeaves(leaves, 'normal')
    expect(leaves[0]!.text).toBe('a  b')
  })

  it('treats a linebreak as a boundary that trims following leading space', () => {
    const leaves = [t('a '), br(), t(' b')]
    collapseLeaves(leaves, 'normal')
    expect((leaves[0] as TextNode).text).toBe('a ')
    expect((leaves[2] as TextNode).text).toBe('b')
  })
})

describe('collapseLeaves (pre / pre-line)', () => {
  it('pre preserves all whitespace', () => {
    const leaves = [t('  a\n  b  ')]
    collapseLeaves(leaves, 'pre')
    expect(leaves[0]!.text).toBe('  a\n  b  ')
  })
  it('pre-line collapses spaces but keeps newlines', () => {
    const leaves = [t('a   b\n\nc')]
    collapseLeaves(leaves, 'pre-line')
    expect(leaves[0]!.text).toBe('a b\n\nc')
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/core/src/text/collapse.ts`**

```ts
import type { LineBreakNode, TextNode, WhiteSpace } from '../types'

type Leaf = TextNode | LineBreakNode

const COLLAPSIBLE = /[ \t\r\n\f]+/g // note: U+00A0 (nbsp) is intentionally excluded
const SPACES_TABS = /[ \t\f]+/g

/** Collapse whitespace across a container's flat leaf sequence, by white-space mode. Mutates in place. */
export function collapseLeaves(leaves: Leaf[], whiteSpace: WhiteSpace): void {
  if (whiteSpace === 'pre' || whiteSpace === 'pre-wrap') return // preserve everything

  if (whiteSpace === 'pre-line') {
    for (const leaf of leaves) {
      if (leaf.type === 'text') leaf.text = leaf.text.replace(SPACES_TABS, ' ')
    }
    return
  }

  // 'normal' | 'nowrap': collapse runs, dedupe boundaries, trim edges.
  for (const leaf of leaves) {
    if (leaf.type === 'text') leaf.text = leaf.text.replace(COLLAPSIBLE, ' ')
  }

  let prevEndedWithSpace = true // container start => trim leading
  for (const leaf of leaves) {
    if (leaf.type === 'linebreak') {
      prevEndedWithSpace = true
      continue
    }
    let text = leaf.text
    if (prevEndedWithSpace && text.startsWith(' ')) text = text.slice(1)
    leaf.text = text
    if (text.length > 0) prevEndedWithSpace = text.endsWith(' ')
  }

  // Trim trailing space on the last non-empty text leaf (stop at a trailing linebreak).
  for (let i = leaves.length - 1; i >= 0; i--) {
    const leaf = leaves[i]!
    if (leaf.type === 'linebreak') break
    if (leaf.text.endsWith(' ')) leaf.text = leaf.text.slice(0, -1)
    if (leaf.text.length > 0) break
  }
}
```

- [ ] **Step 4: Run → PASS** (7 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/text/collapse.ts packages/core/test/collapse.test.ts
git commit -m "feat(core): whitespace collapse by white-space mode"
```

---

## Task 6: Text processing over the tree (`text/process-text.ts`)

**Files:** Create `packages/core/src/text/process-text.ts`; Test `packages/core/test/process-text.test.ts`

Walks the tree; for each inline-container: decode all text leaves, collapse them, prune empty text nodes, and drop the container if it has no remaining content.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parse } from '@quanta-studio/react-native-richtext-dom'
import { resolveStyles } from '@quanta-studio/react-native-richtext-css'
import { splitDocument } from '../src/split'
import { processText } from '../src/text/process-text'
import type { BlockNode, InlineContainerNode, InlineNode, TextNode } from '../src/types'

const run = (html: string) => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc)
  return processText(splitDocument(doc, styles))
}

describe('processText', () => {
  it('decodes entities and collapses text', () => {
    const tree = run('<p>a &amp;   b</p>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    expect((ic.children[0] as TextNode).text).toBe('a & b')
  })

  it('collapses across inline boundaries', () => {
    const tree = run('<p><b>a </b> b</p>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    const b = ic.children[0] as InlineNode
    expect((b.children[0] as TextNode).text).toBe('a ')
    expect((ic.children[1] as TextNode).text).toBe('b')
  })

  it('drops inter-block source whitespace (empty containers)', () => {
    const tree = run('<div>\n  <p>a</p>\n  <p>b</p>\n</div>')
    const div = tree[0] as BlockNode
    // the whitespace-only runs between/around the <p>s collapse to empty and are dropped
    expect(div.children.map((c) => c.type)).toEqual(['block', 'block'])
  })

  it('preserves whitespace inside <pre>', () => {
    const tree = run('<pre>  a\n  b</pre>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    expect((ic.children[0] as TextNode).text).toBe('  a\n  b')
  })

  it('drops empty text nodes', () => {
    const tree = run('<p> <b></b> x</p>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    // leading space trimmed; the <b> stays (empty), "x" remains
    const texts = ic.children.filter((c): c is TextNode => c.type === 'text')
    expect(texts.every((t) => t.text.length > 0)).toBe(true)
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/core/src/text/process-text.ts`**

```ts
import { decodeText } from './decode'
import { collapseLeaves } from './collapse'
import type {
  BlockChild,
  InlineChild,
  InlineContainerNode,
  LineBreakNode,
  TextNode,
} from '../types'

type Leaf = TextNode | LineBreakNode

function collectLeaves(children: InlineChild[], out: Leaf[]): void {
  for (const child of children) {
    if (child.type === 'text' || child.type === 'linebreak') out.push(child)
    else collectLeaves(child.children, out)
  }
}

/** Remove empty TextNodes from an inline subtree (in place). */
function pruneEmptyText(children: InlineChild[]): InlineChild[] {
  const result: InlineChild[] = []
  for (const child of children) {
    if (child.type === 'text') {
      if (child.text.length > 0) result.push(child)
    } else if (child.type === 'linebreak') {
      result.push(child)
    } else {
      child.children = pruneEmptyText(child.children)
      result.push(child)
    }
  }
  return result
}

/** True if an inline subtree has any rendered content (a linebreak or non-empty text). */
function hasContent(children: InlineChild[]): boolean {
  for (const child of children) {
    if (child.type === 'linebreak') return true
    if (child.type === 'text') {
      if (child.text.length > 0) return true
    } else if (hasContent(child.children)) {
      return true
    }
  }
  return false
}

function processContainer(node: InlineContainerNode): InlineContainerNode | null {
  const leaves: Leaf[] = []
  collectLeaves(node.children, leaves)
  for (const leaf of leaves) {
    if (leaf.type === 'text') leaf.text = decodeText(leaf.text)
  }
  collapseLeaves(leaves, node.whiteSpace)
  node.children = pruneEmptyText(node.children)
  return hasContent(node.children) ? node : null
}

/** Decode + collapse every inline-container in the tree; drop empty containers. */
export function processText(nodes: BlockChild[]): BlockChild[] {
  const result: BlockChild[] = []
  for (const node of nodes) {
    if (node.type === 'block') {
      node.children = processText(node.children) as Array<(typeof node.children)[number]>
      result.push(node)
    } else {
      const processed = processContainer(node)
      if (processed) result.push(processed)
    }
  }
  return result
}
```

- [ ] **Step 4: Run → PASS** (5 tests); typecheck clean. If the `as Array<...>` cast on the recursive block line trips strictness, type the block-children recursion with an explicit helper that returns `Array<BlockNode | InlineContainerNode>`.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/text/process-text.ts packages/core/test/process-text.test.ts
git commit -m "feat(core): decode + collapse text across the tree"
```

---

## Task 7: List markers (`markers.ts`)

**Files:** Create `packages/core/src/markers.ts`; Test `packages/core/test/markers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parse } from '@quanta-studio/react-native-richtext-dom'
import { resolveStyles } from '@quanta-studio/react-native-richtext-css'
import { splitDocument } from '../src/split'
import { processText } from '../src/text/process-text'
import { annotateMarkers } from '../src/markers'
import type { BlockNode } from '../src/types'

const run = (html: string) => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc)
  return annotateMarkers(processText(splitDocument(doc, styles)))
}

const lis = (tree: ReturnType<typeof run>, listIndex = 0): BlockNode[] => {
  const list = tree[listIndex] as BlockNode
  return list.children.filter((c): c is BlockNode => c.type === 'block' && c.tag === 'li')
}

describe('annotateMarkers', () => {
  it('numbers unordered list items with disc bullets', () => {
    const items = lis(run('<ul><li>a</li><li>b</li></ul>'))
    expect(items.map((li) => li.marker)).toEqual([
      { ordered: false, index: 1, listStyleType: 'disc', text: '•' },
      { ordered: false, index: 2, listStyleType: 'disc', text: '•' },
    ])
  })

  it('numbers ordered list items with decimals', () => {
    const items = lis(run('<ol><li>a</li><li>b</li><li>c</li></ol>'))
    expect(items.map((li) => li.marker?.text)).toEqual(['1.', '2.', '3.'])
    expect(items[0]!.marker?.ordered).toBe(true)
  })

  it('restarts counting per list', () => {
    const tree = run('<ol><li>a</li></ol><ol><li>b</li></ol>')
    expect(lis(tree, 0)[0]!.marker?.index).toBe(1)
    expect(lis(tree, 1)[0]!.marker?.index).toBe(1)
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/core/src/markers.ts`**

```ts
import type { BlockChild, BlockNode } from './types'

const BULLET: Record<string, string> = {
  disc: '•', // •
  circle: '◦', // ◦
  square: '▪', // ▪
  none: '',
}

function markerText(ordered: boolean, index: number, listStyleType: string): string {
  if (ordered) return `${index}.` // decimal; lower-alpha/roman fall back to decimal in v1
  return BULLET[listStyleType] ?? '•'
}

/** Annotate each <li> in the tree with its list marker. Mutates in place; returns the tree. */
export function annotateMarkers(nodes: BlockChild[]): BlockChild[] {
  for (const node of nodes) {
    if (node.type !== 'block') continue
    if (node.tag === 'ul' || node.tag === 'ol') {
      const ordered = node.tag === 'ol'
      let index = 0
      for (const child of node.children) {
        if (child.type === 'block' && child.tag === 'li') {
          index += 1
          const listStyleType = child.control.listStyleType ?? (ordered ? 'decimal' : 'disc')
          child.marker = {
            ordered,
            index,
            listStyleType,
            text: markerText(ordered, index, listStyleType),
          }
        }
      }
    }
    annotateMarkers(node.children)
  }
  return nodes
}
```

- [ ] **Step 4: Run → PASS** (3 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/markers.ts packages/core/test/markers.test.ts
git commit -m "feat(core): annotate list items with markers"
```

---

## Task 8: Orchestrator `buildRenderTree` + barrel

**Files:** Create `packages/core/src/build.ts`; Modify `packages/core/src/index.ts`; Test `packages/core/test/build.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parse } from '@quanta-studio/react-native-richtext-dom'
import { resolveStyles } from '@quanta-studio/react-native-richtext-css'
import { buildRenderTree } from '../src'
import type { BlockNode, InlineContainerNode, TextNode } from '../src'

const build = (html: string) => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc)
  return buildRenderTree(doc, styles)
}

describe('buildRenderTree', () => {
  it('runs split -> processText -> markers end to end', () => {
    const tree = build('<ul><li>one &amp;  two</li></ul>')
    const ul = tree[0] as BlockNode
    expect(ul.tag).toBe('ul')
    const li = ul.children[0] as BlockNode
    expect(li.marker?.text).toBe('•')
    const ic = li.children[0] as InlineContainerNode
    expect((ic.children[0] as TextNode).text).toBe('one & two')
  })

  it('produces a clean paragraph with collapsed text', () => {
    const tree = build('<p>  hello   world  </p>')
    const ic = (tree[0] as BlockNode).children[0] as InlineContainerNode
    expect((ic.children[0] as TextNode).text).toBe('hello world')
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/core/src/build.ts`**

```ts
import type { Document, Element } from '@quanta-studio/react-native-richtext-dom'
import type { ComputedStyle } from '@quanta-studio/react-native-richtext-css'
import { splitDocument } from './split'
import { processText } from './text/process-text'
import { annotateMarkers } from './markers'
import type { BlockChild } from './types'

/** Build the renderer-agnostic styled tree from a parsed DOM + css computed styles. */
export function buildRenderTree(
  document: Document,
  styles: Map<Element, ComputedStyle>,
): BlockChild[] {
  return annotateMarkers(processText(splitDocument(document, styles)))
}
```

- [ ] **Step 4: Implement the public barrel `packages/core/src/index.ts`**

```ts
export { buildRenderTree } from './build'
export type {
  RenderNode,
  BlockNode,
  InlineContainerNode,
  InlineNode,
  TextNode,
  LineBreakNode,
  BlockChild,
  InlineChild,
  ListMarker,
  WhiteSpace,
  RNStyle,
  ControlStyle,
} from './types'
```

- [ ] **Step 5: Run → PASS**; whole-package typecheck (`pnpm --filter @quanta-studio/react-native-richtext-core typecheck`) → clean.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/build.ts packages/core/src/index.ts packages/core/test/build.test.ts
git commit -m "feat(core): add buildRenderTree orchestrator and public API"
```

---

## Task 9: Integration fixtures

**Files:** Create `packages/core/test/fixtures/article.html`, `packages/core/test/integration.test.ts`

- [ ] **Step 1: Create `packages/core/test/fixtures/article.html`**

```html
<article>
  <h1>Title</h1>
  <p>
    Intro with <strong>bold</strong>, <em>italic</em>, and a <a href="https://example.com">link</a>.
  </p>
  <ul>
    <li>first</li>
    <li>second</li>
  </ul>
  <blockquote>A &ldquo;quote&rdquo; with&nbsp;nbsp.</blockquote>
  <pre>
  preformatted
  text</pre
  >
</article>
```

- [ ] **Step 2: Write `packages/core/test/integration.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from '@quanta-studio/react-native-richtext-dom'
import { resolveStyles } from '@quanta-studio/react-native-richtext-css'
import { buildRenderTree } from '../src'
import type { BlockNode, InlineContainerNode, InlineNode, TextNode } from '../src'

const html = readFileSync(
  fileURLToPath(new URL('./fixtures/article.html', import.meta.url)),
  'utf8',
)

const findBlock = (
  nodes: ReturnType<typeof buildRenderTree>,
  tag: string,
): BlockNode | undefined => {
  for (const n of nodes) {
    if (n.type === 'block') {
      if (n.tag === tag) return n
      const inner = findBlock(n.children, tag)
      if (inner) return inner
    }
  }
  return undefined
}

describe('integration: article.html', () => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc, { baseStyle: { fontSize: 16, color: '#000000' } })
  const tree = buildRenderTree(doc, styles)

  it('builds the article as a block with block children', () => {
    const article = findBlock(tree, 'article')!
    expect(article.type).toBe('block')
    expect(article.children.some((c) => c.type === 'block' && c.tag === 'h1')).toBe(true)
  })

  it('the intro paragraph collapses whitespace and keeps the link href', () => {
    const p = findBlock(tree, 'p')!
    const ic = p.children.find((c): c is InlineContainerNode => c.type === 'inline-container')!
    const a = ic.children.find((c): c is InlineNode => c.type === 'inline' && c.tag === 'a')!
    expect(a.attribs.href).toBe('https://example.com')
    const firstText = ic.children.find((c): c is TextNode => c.type === 'text')!
    expect(firstText.text.includes('  ')).toBe(false) // no double spaces
  })

  it('the list items get bullet markers', () => {
    const ul = findBlock(tree, 'ul')!
    const items = ul.children.filter((c): c is BlockNode => c.type === 'block' && c.tag === 'li')
    expect(items.map((li) => li.marker?.text)).toEqual(['•', '•'])
  })

  it('blockquote decodes smart quotes and nbsp', () => {
    const bq = findBlock(tree, 'blockquote')!
    const ic = bq.children.find((c): c is InlineContainerNode => c.type === 'inline-container')!
    const text = ic.children.find((c): c is TextNode => c.type === 'text')!.text
    expect(text).toContain('“') // “
    expect(text).toContain(' ') // nbsp preserved
  })

  it('pre preserves its internal whitespace and newline', () => {
    const pre = findBlock(tree, 'pre')!
    const ic = pre.children.find((c): c is InlineContainerNode => c.type === 'inline-container')!
    const text = ic.children.find((c): c is TextNode => c.type === 'text')!.text
    expect(text).toContain('\n')
    expect(text).toContain('  ') // indentation preserved
  })
})
```

- [ ] **Step 3: Run → PASS** (5 tests). If any assertion fails, investigate the engine (do not weaken the assertion) — these reflect the spec's intended behavior. Note: `@types/node` was added in Task 0 for `node:fs`/`node:url`.

- [ ] **Step 4: Commit**

```bash
git add packages/core/test/fixtures packages/core/test/integration.test.ts
git commit -m "test(core): add end-to-end article fixture integration test"
```

---

## Task 10: Changeset + full green gate

**Files:** Create `.changeset/phase-2-core.md`

- [ ] **Step 1: Add the changeset** — `.changeset/phase-2-core.md`

```md
---
'@quanta-studio/react-native-richtext-core': minor
---

Add the render-model builder: `buildRenderTree(document, styles)` turns a parsed DOM plus
per-element computed styles into a renderer-agnostic styled tree — block/inline split (the
"no View inside Text" rule), whitespace collapse, entity decode, and basic list markers.
```

- [ ] **Step 2: Run the full workspace gate (mirrors CI)**

Run: `pnpm install && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all exit 0. If `format:check` flags files, run `pnpm format` and re-run `pnpm test`.

- [ ] **Step 3: Commit**

```bash
git add .changeset packages/core
git commit -m "chore(core): add changeset for the Phase 2 render-model package"
```

- [ ] **Step 4: Stop for branch finishing.** Do NOT push/PR here — the controller will use the finishing-a-development-branch skill so the user chooses merge vs PR (matching the Phase 1 flow).

---

## Self-Review (completed during planning)

**1. Spec coverage** — every spec section maps to a task:

- Package + deps + source-resolution wiring → Task 0 (incl. the css vitest alias + dom/css `paths`).
- Node taxonomy (block/inline-container/inline/text/linebreak + ListMarker) → Task 1. _Refinement: element nodes carry `control`; `InlineContainerNode` carries `whiteSpace` — noted in the header and Task 1._
- Stage 1 prune & classify → Task 2 (predicates) + applied in Task 3.
- Stage 2 split (inline-run grouping, br, href, root grouping, keys, block-in-inline flatten) → Task 3.
- Stage 3 text: decode → Task 4; collapse (normal/pre/pre-line, nbsp, boundary, trim) → Task 5; tree-walk + drop-empties + inter-block-whitespace drop → Task 6.
- Stage 4 markers (disc/decimal/index/listStyleType/per-list restart) → Task 7.
- Edge handling (display:none, non-rendered, unknown tags kept, empty containers dropped) → Tasks 2/3/6.
- Public API `buildRenderTree(document, styles)` → Task 8. Testing (per-stage + fixtures) → every task + Task 9.
- Out-of-scope items (RN rendering, nested counters, tables, img, inline-block box, bidi) → genuinely not implemented.

**2. Placeholder scan** — no `TBD`/`TODO`/"handle edge cases"; every code step has real code + exact commands.

**3. Type consistency** — `BlockChild`, `InlineChild`, `BlockNode`, `InlineContainerNode` (with `whiteSpace`), `InlineNode`, `TextNode`, `LineBreakNode`, `ListMarker`, `Display`, `Styles` are defined in Tasks 1/2/3 and used identically in Tasks 5/6/7/8. `splitDocument`, `processText`, `annotateMarkers`, `buildRenderTree`, `collapseLeaves`, `decodeText` signatures match across tasks.

**One open item flagged for execution:** the recursive block-children reassignment in `processText` (Task 6 Step 3) uses an inline cast; if strict mode rejects it, extract a typed `processBlockChildren(children: Array<BlockNode | InlineContainerNode>): Array<BlockNode | InlineContainerNode>` helper — behavior identical.

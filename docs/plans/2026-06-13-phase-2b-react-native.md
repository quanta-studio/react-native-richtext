# Phase 2b: `@scope/react-native` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@yk-yong/rn-rich-text` (the flagship public package) — the `<RichText>` component that orchestrates `parse → resolveStyles → buildRenderTree` and walks the `RenderNode` tree to React Native elements via a renderer registry, with per-weight/style font resolution and `onLinkPress` — plus a minimal Expo example screen.

**Architecture:** Approach A — a recursive `NodeRenderer` dispatches by node type and looks up `registry[node.tag]` (consumer override merged over built-in defaults), falling back to generic `Block`/`Inline`. Shared concerns (`registry`, `fonts`, `onLinkPress`) live in `RichTextContext`. Block→`<View>` (box style), inline-container/inline→`<Text>` (text style, font-resolved). The "no View inside Text" invariant is already guaranteed by core's tree.

**Tech Stack:** TypeScript 6 (`jsx: react-jsx`, strict, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`), React + React Native (peers), react-test-renderer, Vitest 4 (+ a `react-native` mock aliased at the runner level), tsup, pnpm. Workspace deps: dom, css, core.

**Reference:** spec at `docs/specs/2026-06-13-phase-2b-react-native-design.md`. Mirror `packages/core` for base config; this package adds JSX + the RN peer/test setup.

**New infra this plan introduces (call-outs):**
- First TSX package → `jsx: react-jsx` in tsconfigs; tests are `.test.tsx`.
- The root `vitest.config.ts` must (a) add a `@yk-yong/rn-rich-text-core` source alias, (b) add an **exact** `react-native` → mock alias, and (c) widen the `include` glob to `*.test.{ts,tsx}`. The alias block is converted to the **array form** so `react-native` can use a `/^react-native$/` regex (exact match, no prefix bleed).
- `react`/`react-native` are **peer** deps; dev-installed for typecheck + tests. `react`/`react-test-renderer` are pinned to the same 18.x line for stable react-test-renderer.

---

## File Structure

```
packages/react-native/
  package.json, tsconfig.json, tsconfig.test.json, tsup.config.ts, README.md, LICENSE
  src/
    index.ts                 # barrel
    types.ts                 # RichTextProps, Renderer, RendererProps, FontMap, FontFaces
    context.tsx              # RichTextContext + useRichTextContext
    NodeRenderer.tsx         # recursive dispatch
    RichText.tsx             # orchestrate + provide context
    style/split-style.ts     # RNStyle -> { view, text }
    fonts/resolve-font.ts    # font face resolution
    renderers/
      Block.tsx InlineContainer.tsx Inline.tsx Anchor.tsx ListItem.tsx Rule.tsx
      defaults.ts            # default registry (a, li, hr)
  test/
    react-native-mock.tsx    # the RN mock (aliased via vitest)
    *.test.tsx
example/                     # minimal Expo screen (manual; not in CI)
```

Run one test: `pnpm exec vitest run packages/react-native/test/<name>.test.tsx`
Typecheck: `pnpm --filter @yk-yong/rn-rich-text typecheck`

---

## Task 0: Scaffold `@yk-yong/rn-rich-text`

**Files:** Create `packages/react-native/{package.json,tsconfig.json,tsconfig.test.json,tsup.config.ts,README.md,LICENSE,src/index.ts}`; Modify root `tsconfig.json` + root `vitest.config.ts`.

- [ ] **Step 1: `packages/react-native/package.json`** (peers + deps added via pnpm in Step 7; start with this skeleton)

```json
{
  "name": "@yk-yong/rn-rich-text",
  "version": "0.0.0",
  "description": "Fabric-native HTML renderer for React Native: the <RichText> component.",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": { "build": "tsup", "typecheck": "tsc -p tsconfig.test.json", "clean": "rimraf dist" },
  "publishConfig": { "access": "public" },
  "keywords": ["react-native", "html", "rich-text", "renderer", "fabric"]
}
```

- [ ] **Step 2: `packages/react-native/tsconfig.json`** (composite build; jsx; references all three workspace deps)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist",
    "emitDeclarationOnly": true,
    "tsBuildInfoFile": "tsconfig.tsbuildinfo",
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "../dom" }, { "path": "../css" }, { "path": "../core" }]
}
```

- [ ] **Step 3: `packages/react-native/tsconfig.test.json`** (jsx; source `paths` for the 3 workspace deps; NO `types` array so all `@types/*` incl. react + node are visible)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": false,
    "noEmit": true,
    "jsx": "react-jsx",
    "paths": {
      "@yk-yong/rn-rich-text-dom": ["../dom/src/index.ts"],
      "@yk-yong/rn-rich-text-css": ["../css/src/index.ts"],
      "@yk-yong/rn-rich-text-core": ["../core/src/index.ts"]
    }
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 4: `packages/react-native/tsup.config.ts`** (identical to core's — tsup externalizes deps + peerDeps automatically, so react/react-native/workspace pkgs are not bundled), `README.md`, copy `LICENSE`

`tsup.config.ts`:
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
`README.md`:
```md
# @yk-yong/rn-rich-text

Fabric-native HTML renderer for React Native. Renders an HTML string to native
`<View>`/`<Text>` via `<RichText source={{ html }} />`, with a renderer registry,
per-weight/style font resolution, and `onLinkPress`.

Not yet published — internal to the rn-rich-text monorepo.
```
Copy: `cp packages/dom/LICENSE packages/react-native/LICENSE`

- [ ] **Step 5: root `tsconfig.json`** — add the react-native reference:

```json
{
  "files": [],
  "references": [
    { "path": "packages/dom" },
    { "path": "packages/css" },
    { "path": "packages/core" },
    { "path": "packages/react-native" }
  ]
}
```

- [ ] **Step 6: root `vitest.config.ts`** — convert `alias` to ARRAY form, add the core source alias and the exact `react-native` mock alias, and widen `include` to `.tsx`:

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  // Resolve workspace packages to their source so tests run without a prior build;
  // swap react-native for a lightweight mock so RN components render under Node.
  resolve: {
    alias: [
      { find: '@yk-yong/rn-rich-text-dom', replacement: src('./packages/dom/src/index.ts') },
      { find: '@yk-yong/rn-rich-text-css', replacement: src('./packages/css/src/index.ts') },
      { find: '@yk-yong/rn-rich-text-core', replacement: src('./packages/core/src/index.ts') },
      { find: /^react-native$/, replacement: src('./packages/react-native/test/react-native-mock.tsx') },
    ],
  },
  test: {
    include: ['packages/*/test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: ['**/index.ts', '**/types.ts', '**/test/**'],
    },
  },
})
```

- [ ] **Step 7: Add deps via pnpm** (peers + dev; pinned react line for stable react-test-renderer)

```bash
pnpm --filter @yk-yong/rn-rich-text add @yk-yong/rn-rich-text-dom@workspace:* @yk-yong/rn-rich-text-css@workspace:* @yk-yong/rn-rich-text-core@workspace:*
pnpm --filter @yk-yong/rn-rich-text add -P --save-peer react@">=18.2.0" react-native@">=0.74.0"
pnpm --filter @yk-yong/rn-rich-text add -D react@18.3.1 react-test-renderer@18.3.1 react-native @types/react@18 @types/node
```
(If pnpm balks at the peer-range syntax, set `peerDependencies` directly in package.json to `{"react": ">=18.2.0", "react-native": ">=0.74.0"}` and dev-install `react@18.3.1 react-test-renderer@18.3.1 react-native @types/react@18 @types/node`. Report the resolved versions.)

- [ ] **Step 8: Placeholder `packages/react-native/src/index.ts`**

```ts
export {}
```

- [ ] **Step 9: Verify** — `pnpm install && pnpm --filter @yk-yong/rn-rich-text typecheck && pnpm --filter @yk-yong/rn-rich-text build` → exit 0; `dist/index.js` + `index.cjs` produced. Also confirm the other packages still typecheck: `pnpm typecheck`.

- [ ] **Step 10: Commit**

```bash
git add packages/react-native tsconfig.json vitest.config.ts package.json pnpm-lock.yaml
git commit -m "chore(rn): scaffold @yk-yong/rn-rich-text package"
```

---

## Task 1: react-native mock + test-infra smoke test

**Files:** Create `packages/react-native/test/react-native-mock.tsx`; Test `packages/react-native/test/infra.test.tsx`

- [ ] **Step 1: Write the smoke test** — `packages/react-native/test/infra.test.tsx`

```tsx
import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text, StyleSheet, Linking } from 'react-native'

describe('react-native mock + react-test-renderer', () => {
  it('renders mock host components with inspectable props', () => {
    const tree = create(
      <View style={{ margin: 5 }}>
        <Text style={{ color: 'red' }}>hi</Text>
      </View>,
    )
    const view = tree.root.findByType(View)
    expect(view.props.style).toEqual({ margin: 5 })
    const text = tree.root.findByType(Text)
    expect(text.props.style).toEqual({ color: 'red' })
  })

  it('StyleSheet.flatten merges arrays', () => {
    expect(StyleSheet.flatten([{ a: 1 }, null, { b: 2 }])).toEqual({ a: 1, b: 2 })
  })

  it('Linking.openURL is a spy', () => {
    void Linking.openURL('https://x.com')
    expect(Linking.openURL).toHaveBeenCalledWith('https://x.com')
  })
})
```

- [ ] **Step 2: Run → FAIL** (`pnpm exec vitest run packages/react-native/test/infra.test.tsx`) — mock module not found.

- [ ] **Step 3: Implement `packages/react-native/test/react-native-mock.tsx`**

```tsx
import { createElement, type ReactNode } from 'react'
import { vi } from 'vitest'

type HostProps = Record<string, unknown> & { children?: ReactNode }

const host =
  (type: string) =>
  ({ children, ...props }: HostProps) =>
    createElement(type, props, children)

export const View = host('View')
export const Text = host('Text')
export const Pressable = host('Pressable')

export const StyleSheet = {
  create: <T,>(styles: T): T => styles,
  flatten: (style: unknown): Record<string, unknown> => {
    if (Array.isArray(style)) {
      return Object.assign({}, ...style.flat(Infinity).filter(Boolean))
    }
    return (style as Record<string, unknown>) ?? {}
  },
}

export const Linking = { openURL: vi.fn((_url: string) => Promise.resolve()) }

// Minimal type stand-ins used by source imports (the real react-native types are
// used at typecheck time; this mock is only swapped in at test runtime via the alias).
export type ViewStyle = Record<string, unknown>
export type TextStyle = Record<string, unknown>
export type StyleProp<T> = T | T[] | null | undefined
```

- [ ] **Step 4: Run → PASS** (3 tests). Note: this proves the `react-native` alias resolves to the mock, react-test-renderer renders host components, props (incl. `style`) are inspectable, and `Linking.openURL` is a spy. If `tree.root.findByType(View)` throws "no instances", confirm the alias `find: /^react-native$/` is present in the root vitest config.

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/test/react-native-mock.tsx packages/react-native/test/infra.test.tsx
git commit -m "test(rn): add react-native mock and test-infra smoke test"
```

---

## Task 2: Public types (`types.ts`)

**Files:** Create `packages/react-native/src/types.ts`; Test `packages/react-native/test/types.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest'
import type { RichTextProps, Renderer, RendererProps, FontMap } from '../src/types'

describe('types', () => {
  it('constructs the public prop shapes', () => {
    const fonts: FontMap = {
      Montserrat: { '700': { normal: 'Montserrat-Bold', italic: 'Montserrat-BoldItalic' } },
    }
    const props: RichTextProps = {
      source: { html: '<p>x</p>' },
      baseStyle: { fontSize: 16 },
      tagStyles: { p: { color: 'red' } },
      classStyles: { note: { color: 'blue' } },
      fonts,
      onLinkPress: (href) => void href,
    }
    const renderer: Renderer = ({ node }: RendererProps) => null
    expect([props.source.html, typeof renderer, fonts.Montserrat['700']!.normal]).toEqual([
      '<p>x</p>',
      'function',
      'Montserrat-Bold',
    ])
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/react-native/src/types.ts`**

```ts
import type { ReactNode, ComponentType } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import type { RenderNode, RNStyle } from '@yk-yong/rn-rich-text-core'

export type { RenderNode, RNStyle }

export interface RendererProps {
  node: RenderNode
  children?: ReactNode
}

export type Renderer = ComponentType<RendererProps>

export type FontFaces = { normal?: string; italic?: string }
export type FontMap = Record<string, Record<string, FontFaces>>

export interface RichTextProps {
  source: { html: string }
  baseStyle?: RNStyle
  tagStyles?: Record<string, RNStyle>
  classStyles?: Record<string, RNStyle>
  renderers?: Record<string, Renderer>
  fonts?: FontMap
  onLinkPress?: (href: string) => void
  style?: StyleProp<ViewStyle>
}
```

- [ ] **Step 4: Run → PASS**; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/src/types.ts packages/react-native/test/types.test.tsx
git commit -m "feat(rn): add public type definitions"
```

---

## Task 3: View/Text style split (`style/split-style.ts`)

**Files:** Create `packages/react-native/src/style/split-style.ts`; Test `packages/react-native/test/split-style.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest'
import { splitStyle } from '../src/style/split-style'

describe('splitStyle', () => {
  it('routes text props to text and box props to view', () => {
    const { view, text } = splitStyle({
      color: 'red',
      fontSize: 14,
      fontWeight: 'bold',
      marginTop: 10,
      backgroundColor: 'blue',
      width: 100,
    })
    expect(text).toEqual({ color: 'red', fontSize: 14, fontWeight: 'bold' })
    expect(view).toEqual({ marginTop: 10, backgroundColor: 'blue', width: 100 })
  })

  it('handles an empty style', () => {
    expect(splitStyle({})).toEqual({ view: {}, text: {} })
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/react-native/src/style/split-style.ts`**

```ts
import type { RNStyle } from '@yk-yong/rn-rich-text-core'

const TEXT_PROPS = new Set<string>([
  'color',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'fontVariant',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textDecorationLine',
  'textDecorationColor',
  'textDecorationStyle',
  'textTransform',
])

/** Partition an RNStyle into text props (for <Text>) and the rest (for <View>). */
export function splitStyle(style: RNStyle): { view: Record<string, unknown>; text: Record<string, unknown> } {
  const view: Record<string, unknown> = {}
  const text: Record<string, unknown> = {}
  for (const [prop, value] of Object.entries(style)) {
    if (value === undefined) continue
    if (TEXT_PROPS.has(prop)) text[prop] = value
    else view[prop] = value
  }
  return { view, text }
}
```

- [ ] **Step 4: Run → PASS**; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/src/style/split-style.ts packages/react-native/test/split-style.test.tsx
git commit -m "feat(rn): split RNStyle into view and text props"
```

---

## Task 4: Font resolution (`fonts/resolve-font.ts`)

**Files:** Create `packages/react-native/src/fonts/resolve-font.ts`; Test `packages/react-native/test/resolve-font.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest'
import { resolveFont } from '../src/fonts/resolve-font'
import type { FontMap } from '../src/types'

const fonts: FontMap = {
  Montserrat: {
    '400': { normal: 'Montserrat-Regular', italic: 'Montserrat-Italic' },
    '700': { normal: 'Montserrat-Bold', italic: 'Montserrat-BoldItalic' },
  },
}

describe('resolveFont', () => {
  it('maps bold to a concrete face and drops weight/style', () => {
    expect(resolveFont({ fontFamily: 'Montserrat', fontWeight: 'bold' }, fonts)).toEqual({
      fontFamily: 'Montserrat-Bold',
    })
  })

  it('maps italic', () => {
    expect(resolveFont({ fontFamily: 'Montserrat', fontStyle: 'italic' }, fonts)).toEqual({
      fontFamily: 'Montserrat-Italic',
    })
  })

  it('maps bold italic via numeric weight', () => {
    expect(
      resolveFont({ fontFamily: 'Montserrat', fontWeight: '700', fontStyle: 'italic' }, fonts),
    ).toEqual({ fontFamily: 'Montserrat-BoldItalic' })
  })

  it('keeps other style props', () => {
    expect(resolveFont({ fontFamily: 'Montserrat', fontWeight: 'bold', color: 'red' }, fonts)).toEqual({
      fontFamily: 'Montserrat-Bold',
      color: 'red',
    })
  })

  it('passes through when the family/face is not registered', () => {
    expect(resolveFont({ fontFamily: 'Arial', fontWeight: 'bold' }, fonts)).toEqual({
      fontFamily: 'Arial',
      fontWeight: 'bold',
    })
    expect(resolveFont({ color: 'red' }, undefined)).toEqual({ color: 'red' })
  })

  it('uses the first family from a comma list', () => {
    expect(resolveFont({ fontFamily: '"Montserrat", sans-serif', fontWeight: 'bold' }, fonts)).toEqual({
      fontFamily: 'Montserrat-Bold',
    })
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/react-native/src/fonts/resolve-font.ts`**

```ts
import type { FontMap } from '../types'

function firstFamily(fontFamily: string): string {
  const first = fontFamily.split(',')[0] ?? fontFamily
  return first.trim().replace(/^['"]|['"]$/g, '')
}

function normalizeWeight(weight: string | undefined): string {
  if (weight === undefined || weight === 'normal') return '400'
  if (weight === 'bold') return '700'
  return weight
}

/** Resolve (family, weight, style) to a concrete font face, dropping weight/style on a hit. */
export function resolveFont(
  style: Record<string, unknown>,
  fonts: FontMap | undefined,
): Record<string, unknown> {
  const family = typeof style.fontFamily === 'string' ? style.fontFamily : undefined
  if (!fonts || !family) return style

  const weight = normalizeWeight(style.fontWeight as string | undefined)
  const styleKey = style.fontStyle === 'italic' ? 'italic' : 'normal'
  const face = fonts[firstFamily(family)]?.[weight]?.[styleKey]
  if (!face) return style

  const { fontWeight: _w, fontStyle: _s, ...rest } = style
  return { ...rest, fontFamily: face }
}
```

- [ ] **Step 4: Run → PASS** (6 tests); typecheck clean. If `noUnusedLocals`/eslint flags `_w`/`_s`, rename the destructure to drop them explicitly (e.g. delete from a shallow copy) — but the `_`-prefix is conventionally ignored.

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/src/fonts/resolve-font.ts packages/react-native/test/resolve-font.test.tsx
git commit -m "feat(rn): per-weight/style font face resolution"
```

---

## Task 5: Context (`context.tsx`)

**Files:** Create `packages/react-native/src/context.tsx`; Test `packages/react-native/test/context.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { Text } from 'react-native'
import { RichTextContext, useRichTextContext } from '../src/context'

function Probe() {
  const { onLinkPress } = useRichTextContext()
  return <Text>{typeof onLinkPress}</Text>
}

describe('RichTextContext', () => {
  it('provides registry, fonts, and onLinkPress to consumers', () => {
    const value = { registry: {}, fonts: undefined, onLinkPress: (_h: string) => {} }
    const tree = create(
      <RichTextContext.Provider value={value}>
        <Probe />
      </RichTextContext.Provider>,
    )
    expect(tree.root.findByType(Text).children).toEqual(['function'])
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/react-native/src/context.tsx`**

```tsx
import { createContext, useContext } from 'react'
import type { FontMap, Renderer } from './types'

export interface RichTextContextValue {
  registry: Record<string, Renderer>
  fonts: FontMap | undefined
  onLinkPress: (href: string) => void
}

export const RichTextContext = createContext<RichTextContextValue | null>(null)

export function useRichTextContext(): RichTextContextValue {
  const value = useContext(RichTextContext)
  if (value === null) {
    throw new Error('useRichTextContext must be used within a <RichText> (RichTextContext.Provider)')
  }
  return value
}
```

- [ ] **Step 4: Run → PASS**; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/src/context.tsx packages/react-native/test/context.test.tsx
git commit -m "feat(rn): add RichTextContext and useRichTextContext"
```

---

## Task 6: Generic renderers (`Block`, `InlineContainer`, `Inline`)

**Files:** Create `packages/react-native/src/renderers/Block.tsx`, `InlineContainer.tsx`, `Inline.tsx`; Test `packages/react-native/test/generic-renderers.test.tsx`

These render their `node` + `children`. `InlineContainer`/`Inline` font-resolve their text style via context.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { Block } from '../src/renderers/Block'
import { InlineContainer } from '../src/renderers/InlineContainer'
import { Inline } from '../src/renderers/Inline'
import { RichTextContext } from '../src/context'
import type { BlockNode, InlineContainerNode, InlineNode } from '@yk-yong/rn-rich-text-core'

const ctx = { registry: {}, fonts: { Mont: { '700': { normal: 'Mont-Bold' } } }, onLinkPress: () => {} }
const wrap = (ui: React.ReactNode) =>
  create(<RichTextContext.Provider value={ctx}>{ui}</RichTextContext.Provider>)

describe('generic renderers', () => {
  it('Block renders a View with box style only', () => {
    const node: BlockNode = {
      type: 'block', tag: 'div', style: { marginTop: 10, color: 'red' },
      control: { display: 'block', whiteSpace: 'normal' }, attribs: {}, children: [], key: '0',
    }
    const tree = wrap(<Block node={node}><Text>x</Text></Block>)
    const view = tree.root.findByType(View)
    expect(view.props.style).toEqual({ marginTop: 10 })
  })

  it('InlineContainer renders a Text with text style', () => {
    const node: InlineContainerNode = {
      type: 'inline-container', style: { color: 'red', marginTop: 10 }, whiteSpace: 'normal', children: [], key: '0',
    }
    const tree = wrap(<InlineContainer node={node}>hi</InlineContainer>)
    const text = tree.root.findByType(Text)
    expect(text.props.style).toEqual({ color: 'red' })
  })

  it('Inline font-resolves bold to a concrete face', () => {
    const node: InlineNode = {
      type: 'inline', tag: 'b', style: { fontFamily: 'Mont', fontWeight: 'bold' },
      control: { display: 'inline', whiteSpace: 'normal' }, attribs: {}, children: [], key: '0',
    }
    const tree = wrap(<Inline node={node}>x</Inline>)
    expect(tree.root.findByType(Text).props.style).toEqual({ fontFamily: 'Mont-Bold' })
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement the three renderers**

`packages/react-native/src/renderers/Block.tsx`:
```tsx
import { View } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@yk-yong/rn-rich-text-core'

export function Block({ node, children }: RendererProps) {
  const { view } = splitStyle((node as BlockNode).style)
  return <View style={view}>{children}</View>
}
```

`packages/react-native/src/renderers/InlineContainer.tsx`:
```tsx
import { Text } from 'react-native'
import { splitStyle } from '../style/split-style'
import { resolveFont } from '../fonts/resolve-font'
import { useRichTextContext } from '../context'
import type { RendererProps } from '../types'
import type { InlineContainerNode } from '@yk-yong/rn-rich-text-core'

export function InlineContainer({ node, children }: RendererProps) {
  const { fonts } = useRichTextContext()
  const { text } = splitStyle((node as InlineContainerNode).style)
  return <Text style={resolveFont(text, fonts)}>{children}</Text>
}
```

`packages/react-native/src/renderers/Inline.tsx`:
```tsx
import { Text } from 'react-native'
import { splitStyle } from '../style/split-style'
import { resolveFont } from '../fonts/resolve-font'
import { useRichTextContext } from '../context'
import type { RendererProps } from '../types'
import type { InlineNode } from '@yk-yong/rn-rich-text-core'

export function Inline({ node, children }: RendererProps) {
  const { fonts } = useRichTextContext()
  const { text } = splitStyle((node as InlineNode).style)
  return <Text style={resolveFont(text, fonts)}>{children}</Text>
}
```

- [ ] **Step 4: Run → PASS** (3 tests); typecheck clean. (The `node as BlockNode` casts are because `RendererProps.node` is the `RenderNode` union; each renderer is only invoked for its node type by `NodeRenderer`.)

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/src/renderers/Block.tsx packages/react-native/src/renderers/InlineContainer.tsx packages/react-native/src/renderers/Inline.tsx packages/react-native/test/generic-renderers.test.tsx
git commit -m "feat(rn): generic Block, InlineContainer, and Inline renderers"
```

---

## Task 7: Recursive dispatch (`NodeRenderer.tsx`)

**Files:** Create `packages/react-native/src/NodeRenderer.tsx`; Test `packages/react-native/test/node-renderer.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { NodeRenderer } from '../src/NodeRenderer'
import { RichTextContext } from '../src/context'
import type { BlockNode } from '@yk-yong/rn-rich-text-core'

const ctx = { registry: {}, fonts: undefined, onLinkPress: () => {} }
const wrap = (ui: React.ReactNode) =>
  create(<RichTextContext.Provider value={ctx}>{ui}</RichTextContext.Provider>)

// p (block) > inline-container > text "hi" + inline <b> > text "bold"
const tree: BlockNode = {
  type: 'block', tag: 'p', style: {}, control: { display: 'block', whiteSpace: 'normal' }, attribs: {}, key: '0',
  children: [
    {
      type: 'inline-container', style: {}, whiteSpace: 'normal', key: '0.0',
      children: [
        { type: 'text', text: 'hi ', key: '0.0.0' },
        {
          type: 'inline', tag: 'b', style: { fontWeight: 'bold' },
          control: { display: 'inline', whiteSpace: 'normal' }, attribs: {}, key: '0.0.1',
          children: [{ type: 'text', text: 'bold', key: '0.0.1.0' }],
        },
      ],
    },
  ],
}

describe('NodeRenderer', () => {
  it('renders a block as a View containing a Text with the inline content', () => {
    const r = wrap(<NodeRenderer node={tree} />)
    expect(r.root.findAllByType(View)).toHaveLength(1)
    const texts = r.root.findAllByType(Text)
    // outer inline-container Text + nested <b> Text
    expect(texts.length).toBe(2)
    // the full rendered string content
    expect(r.toJSON()).toBeTruthy()
  })

  it('renders text and linebreak leaves', () => {
    const r = wrap(
      <NodeRenderer
        node={{ type: 'inline-container', style: {}, whiteSpace: 'normal', key: '0',
          children: [
            { type: 'text', text: 'a', key: '0.0' },
            { type: 'linebreak', key: '0.1' },
            { type: 'text', text: 'b', key: '0.2' },
          ] }}
      />,
    )
    const text = r.root.findAllByType(Text)[0]!
    // children are: 'a', '\n', 'b'
    expect(JSON.stringify(r.toJSON())).toContain('\\n')
    expect(text).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/react-native/src/NodeRenderer.tsx`**

```tsx
import { Fragment } from 'react'
import { useRichTextContext } from './context'
import { Block } from './renderers/Block'
import { InlineContainer } from './renderers/InlineContainer'
import { Inline } from './renderers/Inline'
import type { RenderNode } from '@yk-yong/rn-rich-text-core'

export function NodeRenderer({ node }: { node: RenderNode }) {
  const { registry } = useRichTextContext()

  switch (node.type) {
    case 'text':
      return <Fragment>{node.text}</Fragment>
    case 'linebreak':
      return <Fragment>{'\n'}</Fragment>
    case 'inline-container':
      return (
        <InlineContainer node={node}>
          {node.children.map((c) => (
            <NodeRenderer key={c.key} node={c} />
          ))}
        </InlineContainer>
      )
    case 'inline': {
      const Comp = registry[node.tag] ?? Inline
      return (
        <Comp node={node}>
          {node.children.map((c) => (
            <NodeRenderer key={c.key} node={c} />
          ))}
        </Comp>
      )
    }
    case 'block': {
      const Comp = registry[node.tag] ?? Block
      return (
        <Comp node={node}>
          {node.children.map((c) => (
            <NodeRenderer key={c.key} node={c} />
          ))}
        </Comp>
      )
    }
  }
}
```

- [ ] **Step 4: Run → PASS**; typecheck clean. The `switch` is exhaustive over `RenderNode['type']`, so TS infers a return on every path. (If TS complains about a missing return, the node union has a member not handled — add it.)

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/src/NodeRenderer.tsx packages/react-native/test/node-renderer.test.tsx
git commit -m "feat(rn): recursive NodeRenderer dispatch"
```

---

## Task 8: Specializations + default registry (`Anchor`, `ListItem`, `Rule`, `defaults.ts`)

**Files:** Create `packages/react-native/src/renderers/Anchor.tsx`, `ListItem.tsx`, `Rule.tsx`, `defaults.ts`; Test `packages/react-native/test/specializations.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { Anchor } from '../src/renderers/Anchor'
import { ListItem } from '../src/renderers/ListItem'
import { Rule } from '../src/renderers/Rule'
import { defaultRenderers } from '../src/renderers/defaults'
import { RichTextContext } from '../src/context'
import type { BlockNode, InlineNode } from '@yk-yong/rn-rich-text-core'

const makeCtx = (onLinkPress = () => {}) => ({ registry: {}, fonts: undefined, onLinkPress })
const wrap = (ui: React.ReactNode, ctx = makeCtx()) =>
  create(<RichTextContext.Provider value={ctx}>{ui}</RichTextContext.Provider>)

describe('specializations', () => {
  it('Anchor calls onLinkPress(href) on press', () => {
    const onLinkPress = vi.fn()
    const node: InlineNode = {
      type: 'inline', tag: 'a', style: {}, control: { display: 'inline', whiteSpace: 'normal' },
      attribs: { href: 'https://x.com' }, children: [], key: '0',
    }
    const tree = wrap(<Anchor node={node}>link</Anchor>, makeCtx(onLinkPress))
    tree.root.findByType(Text).props.onPress()
    expect(onLinkPress).toHaveBeenCalledWith('https://x.com')
  })

  it('ListItem renders the marker text and content', () => {
    const node: BlockNode = {
      type: 'block', tag: 'li', style: {}, control: { display: 'list-item', whiteSpace: 'normal' },
      attribs: {}, key: '0', marker: { ordered: false, index: 1, listStyleType: 'disc', text: '•' }, children: [],
    }
    const tree = wrap(<ListItem node={node}><Text>item</Text></ListItem>)
    const markerText = tree.root.findAllByType(Text).map((t) => t.props.children).flat()
    expect(JSON.stringify(markerText)).toContain('•')
  })

  it('Rule renders a View', () => {
    const node: BlockNode = {
      type: 'block', tag: 'hr', style: { borderBottomWidth: 1 }, control: { display: 'block', whiteSpace: 'normal' },
      attribs: {}, key: '0', children: [],
    }
    const tree = wrap(<Rule node={node} />)
    expect(tree.root.findByType(View).props.style).toMatchObject({ borderBottomWidth: 1 })
  })

  it('defaultRenderers maps the specializations', () => {
    expect(defaultRenderers.a).toBe(Anchor)
    expect(defaultRenderers.li).toBe(ListItem)
    expect(defaultRenderers.hr).toBe(Rule)
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement the renderers**

`packages/react-native/src/renderers/Anchor.tsx`:
```tsx
import { Text } from 'react-native'
import { splitStyle } from '../style/split-style'
import { resolveFont } from '../fonts/resolve-font'
import { useRichTextContext } from '../context'
import type { RendererProps } from '../types'
import type { InlineNode } from '@yk-yong/rn-rich-text-core'

export function Anchor({ node, children }: RendererProps) {
  const { fonts, onLinkPress } = useRichTextContext()
  const el = node as InlineNode
  const { text } = splitStyle(el.style)
  const href = el.attribs.href
  return (
    <Text style={resolveFont(text, fonts)} onPress={href ? () => onLinkPress(href) : undefined}>
      {children}
    </Text>
  )
}
```

`packages/react-native/src/renderers/ListItem.tsx`:
```tsx
import { View, Text } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@yk-yong/rn-rich-text-core'

export function ListItem({ node, children }: RendererProps) {
  const el = node as BlockNode
  const { view } = splitStyle(el.style)
  const marker = el.marker?.text ?? ''
  return (
    <View style={[view, { flexDirection: 'row' }]}>
      <Text>{marker ? `${marker} ` : ''}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}
```

`packages/react-native/src/renderers/Rule.tsx`:
```tsx
import { View } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@yk-yong/rn-rich-text-core'

export function Rule({ node }: RendererProps) {
  const { view } = splitStyle((node as BlockNode).style)
  return <View style={view} />
}
```

`packages/react-native/src/renderers/defaults.ts`:
```ts
import { Anchor } from './Anchor'
import { ListItem } from './ListItem'
import { Rule } from './Rule'
import type { Renderer } from '../types'

/** Built-in tag specializations. Generic block/inline are NodeRenderer's fallback. */
export const defaultRenderers: Record<string, Renderer> = {
  a: Anchor,
  li: ListItem,
  hr: Rule,
}
```

- [ ] **Step 4: Run → PASS** (4 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/src/renderers/Anchor.tsx packages/react-native/src/renderers/ListItem.tsx packages/react-native/src/renderers/Rule.tsx packages/react-native/src/renderers/defaults.ts packages/react-native/test/specializations.test.tsx
git commit -m "feat(rn): Anchor, ListItem, Rule renderers and default registry"
```

---

## Task 9: `RichText` orchestration + barrel

**Files:** Create `packages/react-native/src/RichText.tsx`; Modify `packages/react-native/src/index.ts`; Test `packages/react-native/test/rich-text.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text, Linking } from 'react-native'
import { RichText } from '../src'

describe('RichText', () => {
  it('renders a paragraph as a View > Text with the collapsed text', () => {
    const tree = create(<RichText source={{ html: '<p>hello   world</p>' }} />)
    const texts = tree.root.findAllByType(Text)
    const flat = JSON.stringify(tree.toJSON())
    expect(flat).toContain('hello world')
    expect(texts.length).toBeGreaterThan(0)
    expect(tree.root.findAllByType(View).length).toBeGreaterThan(0)
  })

  it('applies tagStyles through the cascade', () => {
    const tree = create(
      <RichText source={{ html: '<p>x</p>' }} tagStyles={{ p: { color: 'tomato' } }} />,
    )
    // the inline-container Text under the p carries the inherited color
    const colored = tree.root.findAllByType(Text).some((t) => {
      const s = t.props.style as Record<string, unknown> | undefined
      return s?.color === 'tomato'
    })
    expect(colored).toBe(true)
  })

  it('wires onLinkPress for anchors', () => {
    const onLinkPress = vi.fn()
    const tree = create(
      <RichText source={{ html: '<p><a href="https://x.com">link</a></p>' }} onLinkPress={onLinkPress} />,
    )
    const anchor = tree.root.findAllByType(Text).find((t) => typeof t.props.onPress === 'function')!
    anchor.props.onPress()
    expect(onLinkPress).toHaveBeenCalledWith('https://x.com')
  })

  it('lets a custom renderer override a tag', () => {
    const Custom = () => <View testID="custom" />
    const tree = create(
      <RichText source={{ html: '<p>x</p>' }} renderers={{ p: Custom }} />,
    )
    expect(tree.root.findAll((n) => n.props.testID === 'custom').length).toBe(1)
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement `packages/react-native/src/RichText.tsx`**

```tsx
import { useMemo } from 'react'
import { View, Linking } from 'react-native'
import { parse } from '@yk-yong/rn-rich-text-dom'
import { resolveStyles } from '@yk-yong/rn-rich-text-css'
import { buildRenderTree } from '@yk-yong/rn-rich-text-core'
import { RichTextContext } from './context'
import { NodeRenderer } from './NodeRenderer'
import { defaultRenderers } from './renderers/defaults'
import type { RichTextProps } from './types'

export function RichText(props: RichTextProps) {
  const { source, baseStyle, tagStyles, classStyles, renderers, fonts, onLinkPress, style } = props

  const tree = useMemo(() => {
    const doc = parse(source.html)
    const { styles } = resolveStyles(doc, { baseStyle, tagStyles, classStyles })
    return buildRenderTree(doc, styles)
  }, [source.html, baseStyle, tagStyles, classStyles])

  const registry = useMemo(() => ({ ...defaultRenderers, ...renderers }), [renderers])

  const value = useMemo(
    () => ({
      registry,
      fonts,
      onLinkPress: onLinkPress ?? ((href: string) => void Linking.openURL(href)),
    }),
    [registry, fonts, onLinkPress],
  )

  return (
    <RichTextContext.Provider value={value}>
      <View style={style}>
        {tree.map((node) => (
          <NodeRenderer key={node.key} node={node} />
        ))}
      </View>
    </RichTextContext.Provider>
  )
}
```

- [ ] **Step 4: Implement the barrel `packages/react-native/src/index.ts`**

```ts
export { RichText } from './RichText'
export { RichTextContext, useRichTextContext } from './context'
export { defaultRenderers } from './renderers/defaults'
export { splitStyle } from './style/split-style'
export { resolveFont } from './fonts/resolve-font'
export type {
  RichTextProps,
  Renderer,
  RendererProps,
  FontMap,
  FontFaces,
  RenderNode,
  RNStyle,
} from './types'
```

- [ ] **Step 5: Run → PASS** (4 tests); whole-package typecheck (`pnpm --filter @yk-yong/rn-rich-text typecheck`) → clean.

- [ ] **Step 6: Commit**

```bash
git add packages/react-native/src/RichText.tsx packages/react-native/src/index.ts packages/react-native/test/rich-text.test.tsx
git commit -m "feat(rn): add RichText component and public API"
```

---

## Task 10: End-to-end integration test

**Files:** Create `packages/react-native/test/integration.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { RichText } from '../src'
import type { FontMap } from '../src'

const html =
  '<article><h1>Title</h1><p>Intro with <strong>bold</strong> and <em>italic</em>, ' +
  'plus a <a href="https://example.com">link</a>.</p><ul><li>one</li><li>two</li></ul></article>'

const fonts: FontMap = {
  System: { '700': { normal: 'System-Bold' }, '400': { normal: 'System-Regular' } },
}

describe('integration: RichText', () => {
  it('renders the document structure with Views and Texts', () => {
    const tree = create(<RichText source={{ html }} />)
    expect(tree.root.findAllByType(View).length).toBeGreaterThan(0)
    const json = JSON.stringify(tree.toJSON())
    expect(json).toContain('Title')
    expect(json).toContain('bold')
    expect(json).toContain('•') // list bullets
  })

  it('resolves a registered bold face for <strong>', () => {
    const tree = create(
      <RichText source={{ html: '<p style="font-family: System"><strong>x</strong></p>' }} fonts={fonts} />,
    )
    const boldFace = tree.root.findAllByType(Text).some((t) => {
      const s = t.props.style as Record<string, unknown> | undefined
      return s?.fontFamily === 'System-Bold'
    })
    expect(boldFace).toBe(true)
  })

  it('fires onLinkPress from the rendered anchor', () => {
    const onLinkPress = vi.fn()
    const tree = create(<RichText source={{ html }} onLinkPress={onLinkPress} />)
    const anchor = tree.root.findAllByType(Text).find((t) => typeof t.props.onPress === 'function')!
    anchor.props.onPress()
    expect(onLinkPress).toHaveBeenCalledWith('https://example.com')
  })
})
```

- [ ] **Step 2: Run → PASS** (3 tests). If an assertion fails, investigate the engine (do not weaken it). Note: `<strong>` computes `fontWeight: bold` from the css UA sheet; with `font-family: System` set on the `<p>` (inherited), `resolveFont` finds `System-Bold`.

- [ ] **Step 3: Commit**

```bash
git add packages/react-native/test/integration.test.tsx
git commit -m "test(rn): end-to-end RichText integration test"
```

---

## Task 11: Minimal Expo example screen (manual; not CI)

**Files:** Create `example/package.json`, `example/app.json`, `example/babel.config.js`, `example/metro.config.js`, `example/App.tsx`, `example/README.md`

This is hand-authored (no `expo init`); it is **run manually** by the maintainer and is not part of CI or the workspace test run.

- [ ] **Step 1: Create `example/package.json`**

```json
{
  "name": "rn-rich-text-example",
  "version": "0.0.0",
  "private": true,
  "main": "expo/AppEntry.js",
  "scripts": { "start": "expo start", "ios": "expo start --ios", "android": "expo start --android" },
  "dependencies": {
    "@yk-yong/rn-rich-text": "workspace:*",
    "expo": "~52.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.5"
  }
}
```

- [ ] **Step 2: Create `example/app.json`** (New Architecture on)

```json
{
  "expo": {
    "name": "rn-rich-text-example",
    "slug": "rn-rich-text-example",
    "newArchEnabled": true,
    "ios": { "supportsTablet": true }
  }
}
```

- [ ] **Step 3: Create `example/babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true)
  return { presets: ['babel-preset-expo'] }
}
```

- [ ] **Step 4: Create `example/metro.config.js`** (so Metro follows the pnpm-linked workspace packages)

```js
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = true
module.exports = config
```

- [ ] **Step 5: Create `example/App.tsx`**

```tsx
import { SafeAreaView, ScrollView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { RichText } from '@yk-yong/rn-rich-text'

const html = `
  <h1>rn-rich-text</h1>
  <p>A <strong>Fabric-native</strong> HTML renderer with <em>inline styles</em>,
     <a href="https://example.com">links</a>, and lists:</p>
  <ul><li>first item</li><li>second item</li></ul>
  <blockquote>A short quote &mdash; rendered natively.</blockquote>
  <pre>  preformatted
  text</pre>
`

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <RichText
          source={{ html }}
          baseStyle={{ fontSize: 16, color: '#1a1a1a' }}
          onLinkPress={(href) => console.log('link:', href)}
        />
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  )
}
```

- [ ] **Step 6: Create `example/README.md`**

```md
# Example app

Minimal Expo (New Architecture) screen dogfooding `@yk-yong/rn-rich-text`.

```bash
pnpm install            # from the repo root
cd example && pnpm start
```

Run on a simulator/device via the Expo CLI. Not part of CI — this is for manual
visual validation. If Metro fails to resolve the workspace packages, build them
once from the root (`pnpm build`) so their `dist/` exists.
```

- [ ] **Step 7: Verify the App.tsx typechecks in isolation is NOT required** (the example is outside the TS project graph). Just confirm the files exist and are syntactically valid. Do NOT add `example` to the pnpm workspace `packages:` glob unless `pnpm install` from root succeeds with it; if it causes resolution issues, keep `example` out of the workspace and document the manual `pnpm install` inside `example/`.

- [ ] **Step 8: Commit**

```bash
git add example
git commit -m "docs(example): add minimal Expo screen dogfooding RichText"
```

---

## Task 12: Changeset + full green gate

**Files:** Create `.changeset/phase-2b-react-native.md`

- [ ] **Step 1: Add the changeset**

```md
---
'@yk-yong/rn-rich-text': minor
---

Add the flagship `<RichText>` component: renders an HTML string to native React Native
`<View>`/`<Text>` by orchestrating parse → resolveStyles → buildRenderTree and walking the
render tree via a renderer registry, with per-weight/style font resolution and `onLinkPress`.
```

- [ ] **Step 2: Run the full workspace gate**

Run: `pnpm install && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all exit 0. If `format:check` flags files, run `pnpm format` and re-run `pnpm test`. The `react-native` package's tests run under the RN mock; the other packages are unaffected.

- [ ] **Step 3: Commit**

```bash
git add .changeset packages/react-native
git commit -m "chore(rn): add changeset for the Phase 2b RichText package"
```

- [ ] **Step 4: Stop for branch finishing.** Do NOT push/PR here — the controller will use finishing-a-development-branch so the user chooses merge vs PR.

---

## Self-Review (completed during planning)

**1. Spec coverage** — every spec section maps to a task:
- Package + peers + deps + jsx + source-resolution + RN-mock alias + `.tsx` test glob → Task 0 + Task 1.
- Public API (`RichTextProps`, `Renderer`, `RendererProps`, `FontMap`) → Task 2.
- View/Text style split (the fixed text-prop set) → Task 3.
- Font resolution (the Montserrat insight; weight/style normalization; drop weight/style on hit; first-family) → Task 4.
- `RichTextContext` + `useRichTextContext` → Task 5.
- Default renderers Block/InlineContainer/Inline → Task 6; recursive dispatch + registry lookup → Task 7; Anchor (`onLinkPress`)/ListItem (marker)/Rule + default registry → Task 8.
- Orchestration (memoized parse→resolveStyles→buildRenderTree), registry merge, `onLinkPress` default (`Linking.openURL`), outer `style`, barrel → Task 9.
- Testing (Vitest + RN mock + react-test-renderer, structure/style, no snapshots) → every component task + Task 10 integration.
- Minimal Expo example → Task 11. Out-of-scope (dogfood, canary, img, tables, nested counters, a11y, web) → not implemented.

**2. Placeholder scan** — no `TBD`/`TODO`/"handle edge cases"; every code step has real code + exact commands.

**3. Type consistency** — `RichTextProps`, `Renderer`, `RendererProps`, `FontMap`, `FontFaces`, `RichTextContextValue`, `splitStyle`, `resolveFont`, `NodeRenderer`, `defaultRenderers`, `RichText` are defined in Tasks 2/3/4/5/7/8/9 and used identically downstream. `node as BlockNode|InlineNode|InlineContainerNode` casts are consistent (RendererProps.node is the RenderNode union; NodeRenderer only routes each node type to its matching renderer).

**Two items flagged for execution:**
- The `react@18.3.1`/`react-test-renderer@18.3.1` pin keeps react-test-renderer stable; if pnpm's peer resolution warns about react-native wanting react 19, the dev pin still governs the test runtime (peer ranges are advisory for a library). Report any unavoidable conflict.
- If react-test-renderer emits `act(...)` warnings on `create(...)`, wrap renders in `import { act } from 'react-test-renderer'; let tree; act(() => { tree = create(<.../>) })`. The components have no effects, so this is usually unnecessary — add only if warnings appear.

# rn-rich-text — Phase 2 (sub-project 2b): `@scope/react-native` Design

Date: 2026-06-13
Status: Draft for review
Depends on: Phase 0 (`@yk-yong/rn-rich-text-dom`), Phase 1 (`@yk-yong/rn-rich-text-css`),
Phase 2a (`@yk-yong/rn-rich-text-core`) — all merged. Read the architecture doc
(`docs/specs/2026-06-09-architecture-and-phase-0-design.md`) and the 2a spec
(`docs/specs/2026-06-13-phase-2-core-render-model-design.md`) first.

## What this is

Sub-project 2b: **`@yk-yong/rn-rich-text`**, the flagship public package. It is the first
**React/RN** package (everything before it is React-free). It provides the `<RichText>` component:
it orchestrates `parse → resolveStyles → buildRenderTree` (the three lower packages) and walks the
resulting `RenderNode` tree to React Native elements via a **renderer registry**, with font
resolution and `onLinkPress`. This cycle also delivers a **minimal Expo example screen** for manual
visual validation.

```
source.html ─▶ parse (dom) ─▶ resolveStyles (css) ─▶ buildRenderTree (core) ─▶ RenderNode tree
            ─▶ <RichText> walks the tree via the registry ─▶ RN <View>/<Text> elements
```

## Decisions locked during brainstorming (do not re-litigate)

| Question | Decision |
| --- | --- |
| Cycle scope | **Package + minimal example app.** Build `@yk-yong/rn-rich-text` (tested) plus a minimal Expo screen for visual validation. The cross-repo dogfood (`OutletAboutScreen`) and the canary publish are deferred to a follow-on (they need the fonerewards repo + an NPM token). |
| Test setup | **Vitest + a `react-native` mock + react-test-renderer.** One runner across the monorepo; mock `react-native` so View/Text/etc. are host components; assert structure + styles. No snapshots. |
| Rendering architecture | **Approach A — component registry + context.** A recursive `NodeRenderer` dispatches by node type and looks up `registry[tag]` (consumer override merged over built-in defaults); shared concerns (`registry`, `fonts`, `onLinkPress`) live in `RichTextContext`. |

## Package

- Name: **`@yk-yong/rn-rich-text`** (the headline public package), directory `packages/react-native`.
  This is the first React/RN package — **not** React-free.
- Runtime dependencies: the three workspace packages `@yk-yong/rn-rich-text-dom`,
  `@yk-yong/rn-rich-text-css`, `@yk-yong/rn-rich-text-core`.
- **Peer** dependencies: `react`, `react-native` (New-Architecture-stable floors; exact ranges
  pinned in planning).
- Dev dependencies: `react`, `react-native`, `react-test-renderer`, `@types/react`, `@types/node`.
- TSX (`jsx: react-jsx`); tsup build; Vitest tests. Build/test/tsconfig otherwise mirror the other
  packages, including the source-resolution pattern (`paths` in `tsconfig.test.json` + Vitest
  `resolve.alias`) for the three workspace deps.

## Module structure

```
src/
  index.ts                 # public: RichText + RichTextProps, Renderer, RendererProps, FontMap; re-export core node types
  RichText.tsx             # orchestrate (memoized) + provide context + render roots
  context.tsx              # RichTextContext + useRichTextContext()
  NodeRenderer.tsx         # recursive dispatch by node.type + registry lookup
  renderers/
    defaults.ts            # default registry — specializations only (a, li, hr)
    Block.tsx              # generic block  -> <View>
    InlineContainer.tsx    # anonymous run  -> <Text>
    Inline.tsx             # generic inline -> nested <Text>
    Anchor.tsx             # <a>  -> <Text onPress>
    ListItem.tsx           # <li> -> marker + content row
    Rule.tsx               # <hr> -> <View> rule
  style/split-style.ts     # RNStyle -> { view: ViewStyle, text: TextStyle }
  fonts/resolve-font.ts    # (family, weight, style) + FontMap -> concrete fontFamily
  types.ts                 # RichTextProps, Renderer, RendererProps, FontMap, FontFaces
example/                   # minimal Expo screen (manual validation; not in CI)
```

## Public API

```ts
import type { RenderNode } from '@yk-yong/rn-rich-text-core'
import type { StyleProp, ViewStyle } from 'react-native'

interface RichTextProps {
  source: { html: string }
  baseStyle?: RNStyle
  tagStyles?: Record<string, RNStyle>
  classStyles?: Record<string, RNStyle>
  renderers?: Record<string, Renderer>
  fonts?: FontMap
  onLinkPress?: (href: string) => void
  style?: StyleProp<ViewStyle> // outer container
}

type Renderer = React.ComponentType<RendererProps>
interface RendererProps {
  node: RenderNode
  children?: React.ReactNode
}

type FontFaces = { normal?: string; italic?: string }
type FontMap = Record<string, Record<string, FontFaces>> // family -> weight -> faces
```

`RNStyle` is re-exported from `@yk-yong/rn-rich-text-css` (via core). `useRichTextContext()` returns
`{ registry, fonts, onLinkPress }`.

## Orchestration (`RichText.tsx`)

- `useMemo(() => buildRenderTree(doc, resolveStyles(doc, { baseStyle, tagStyles, classStyles }).styles), [...])`
  where `doc = parse(source.html)`, keyed on `source.html` + the style props.
- A second `useMemo` merges the registry: `{ ...defaultRegistry, ...renderers }`.
- `onLinkPress` defaults to `(href) => void Linking.openURL(href)` when the prop is omitted.
- `RichTextContext.Provider value={{ registry, fonts, onLinkPress }}`.
- Render: `<View style={style}>{tree.map((n) => <NodeRenderer key={n.key} node={n} />)}</View>`.
  (`baseStyle` is already folded into the cascade by css; the `style` prop is for the outer container.)

## Dispatch (`NodeRenderer.tsx`)

Switch on `node.type`:

- `text` → the string (`node.text`);
- `linebreak` → `'\n'`;
- `inline-container` → `<InlineContainer node>` (anonymous; always the default, not tag-overridable);
- `inline` / `block` → `registry[node.tag]` if present, else the generic `Inline` / `Block`.

Children render by mapping `NodeRenderer` over `node.children`. Strings and nested `<Text>` compose
inside the container's `<Text>`; the "no `<View>` inside `<Text>`" invariant is already guaranteed by
core's tree, so the renderer never has to re-derive it.

## Default renderers + the View/Text style split

`style/split-style.ts` partitions an `RNStyle` by a fixed **text-prop set** — `color`, `fontFamily`,
`fontSize`, `fontStyle`, `fontWeight`, `fontVariant`, `lineHeight`, `letterSpacing`, `textAlign`,
`textDecorationLine`, `textDecorationColor`, `textDecorationStyle`, `textTransform` — which go on
`<Text>`; everything else (margin/padding/border/background/width/height/… box + layout) goes on
`<View>`.

- **`Block`** → `<View style={splitStyle(node.style).view}>{children}</View>`.
- **`InlineContainer`** / **`Inline`** → `<Text style={resolveFont(splitStyle(node.style).text, fonts)}>{children}</Text>`.
- **`Anchor`** (`a`) → `<Text style={resolveFont(textStyle, fonts)} onPress={() => onLinkPress(node.attribs.href)}>{children}</Text>`.
- **`ListItem`** (`li`) → `<View style={[view, { flexDirection: 'row' }]}><Text>{node.marker?.text} </Text><View style={{ flex: 1 }}>{children}</View></View>`.
- **`Rule`** (`hr`) → `<View style={view} />`.
- `pre` needs no special renderer: its inline-container carries `whiteSpace: 'pre'`, RN `<Text>`
  renders the already-preserved string verbatim, and monospace comes from the computed style.

The default registry contains only the specializations (`a`, `li`, `hr`). Generic `Block`/`Inline`
are the fallback in `NodeRenderer`. Any consumer `renderers[tag]` overrides by tag and receives
`{ node, children }`, reading `fonts`/`onLinkPress` via `useRichTextContext()`.

## Font resolution (`fonts/resolve-font.ts`)

The Montserrat insight: emphasis selects a font **file**. `resolveFont(textStyle, fonts)`:

1. Take the computed `fontFamily` (first family if it is a comma list; strip quotes).
2. Normalize `fontWeight` (`normal`→`400`, `bold`→`700`; numeric kept) and `fontStyle`
   (`italic` vs `normal`, default `normal`).
3. Look up `fonts[family]?.[weight]?.[style]`. If a concrete face is found → set `fontFamily` to it
   and **remove** `fontWeight`/`fontStyle` (the file encodes them). If not found → return the style
   unchanged (RN's system synthesis of weight/style applies).

So `<b>` (computed `fontWeight: 'bold'`) with `fonts.Montserrat['700'].normal = 'Montserrat-Bold'`
renders `<Text style={{ fontFamily: 'Montserrat-Bold' }}>` — correct bold on RN, where custom fonts
often do not synthesize weight.

## Example app (minimal, manual validation)

A minimal Expo (New Architecture) screen under `example/` (`App.tsx`) that renders a sample article
(headings, `p`, `b`/`i`, a link, a `ul`, `blockquote`, `pre`) through `<RichText>` with a demo
`fonts` map, run via `expo start`. It links the workspace packages. **Not part of CI** (native app,
no automated test); the package's react-test-renderer suite is the automated gate. Expo SDK and
New-Architecture configuration are settled in planning.

## Testing strategy (TDD; Vitest + react-native mock + react-test-renderer; no snapshots)

- **`react-native` mock**: a module in the package's `test/` exporting `View`, `Text`, `Pressable`,
  `StyleSheet.flatten`/`StyleSheet.create`, and `Linking.openURL` as plain host components/stubs,
  wired via a `resolve.alias` in the root `vitest.config.ts` (`'react-native'` → the mock). Safe
  because only this package imports `react-native`. Typecheck still uses the real `react-native`
  types (dev dep); the alias only swaps the test runtime.
- **Unit tests**: `splitStyle` (text/view partition); `resolveFont` (face lookup, weight/style
  normalization, passthrough when unmapped); `Block`→`<View>` with box style; `InlineContainer`/
  `Inline`→`<Text>` with text style; `Inline`(`b`)→nested `<Text>` font-resolved; `Anchor` press →
  `onLinkPress(href)` and the `Linking.openURL` default; `ListItem` marker rendered; registry
  override is used instead of the default.
- **End-to-end**: a sample HTML rendered through `<RichText>` asserts the expected `<View>`/`<Text>`
  structure and styles via `react-test-renderer`.

## Deliverable

A tested `@yk-yong/rn-rich-text` package exposing `<RichText>` (orchestration + registry + default
renderers + font resolution + `onLinkPress`) with green CI, plus a minimal Expo example screen for
manual validation. No cross-repo dogfood, no publish.

## Out of scope (this cycle)

- The cross-repo dogfood (`OutletAboutScreen` in the fonerewards app) and the first canary publish
  (need the separate repo + an NPM token) — a focused follow-on.
- `img` (Phase 3), tables (Phase 4), nested list counters (Phase 3), accessibility roles (Phase 5),
  `react-native-web`.

## Open questions (resolve during planning)

- Exact `react`/`react-native` peer-dependency floors (the New-Architecture-stable line) and which
  versions to dev-install for tests.
- Expo SDK version for the example app and how it links the workspace packages (pnpm + Expo/Metro
  interplay).
- Whether the `react-native` mock lives in the package (`test/react-native-mock.ts`) and is aliased
  globally, vs. a `vi.mock` per test file — the alias approach is preferred for consistency.
- Whether `RichText` should expose a `defaultTextProps`/`defaultViewProps` escape hatch (deferred
  unless the example surfaces a need).

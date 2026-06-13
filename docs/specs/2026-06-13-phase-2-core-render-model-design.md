# rn-rich-text — Phase 2 (sub-project 2a): `@scope/core` Render-Model Design

Date: 2026-06-13
Status: Draft for review
Depends on: Phase 0 (`@yk-yong/rn-rich-text-dom`) and Phase 1 (`@yk-yong/rn-rich-text-css`),
both merged. Read `docs/specs/2026-06-09-architecture-and-phase-0-design.md` and
`docs/specs/2026-06-12-phase-1-css-engine-design.md` first.

## What this is

Phase 2 is decomposed into two sub-projects, each its own spec → plan → implement cycle:

- **2a — `@scope/core`** (this spec): the React-free **render-model builder**. Takes a parsed DOM
  plus the per-element computed styles and produces a renderer-agnostic styled tree, doing the
  block/inline split, whitespace collapse, entity decode, and basic list-marker computation.
- **2b — `@scope/react-native`** (next cycle): the public `<RichText>` component, renderer
  registry, font resolution, `onLinkPress`, the example app, and the dogfood. Built on 2a's tree.

This sub-project owns Stage 4's structural logic from the architecture doc, generalized from the
seed: inline context → nested `<Text>`; block context → `<View>`/`<Text>` via the "no `<View>`
inside `<Text>`" split (driven by computed `display`); whitespace collapse; entity decode (via
`entities`). It produces **data**, not React elements — rendering is 2b.

```
DOM + Map<Element, ComputedStyle>  ─▶  buildRenderTree  ─▶  Array<BlockNode | InlineContainerNode>
```

## Decisions locked during brainstorming (do not re-litigate)

| Question                | Decision                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 2 scope           | **Decompose**: build `@scope/core` first (this spec), then `@scope/react-native` + example + dogfood. Design core's output contract with the RN renderer in mind.                                            |
| Render-model contract   | **Renderer-agnostic styled tree**: nodes keep tag identity, computed `RNStyle`, a block/inline context, and needed attribs (`href`, list info). `@scope/react-native`'s registry maps each node → component. |
| List markers            | **Compute basic markers in core**: annotate each `li` with `{ordered, index, listStyleType, text}` (flat single-level counters). Deep-nesting restart/letters/roman → Phase 3.                               |
| Transformation strategy | **Approach B — staged pipeline**: prune → split → text (decode + collapse) → markers. Each stage is pure and independently testable; collapse operates on already-grouped inline runs.                       |

## Package

- Name: `@yk-yong/rn-rich-text-core`. React-free. Depends on the `@yk-yong/rn-rich-text-dom` and
  `@yk-yong/rn-rich-text-css` workspace packages (the latter for the `ComputedStyle`/`RNStyle`
  types; core consumes the `Map<Element, ComputedStyle>` that `resolveStyles` returns).
- New direct dependency: **`entities`** (complete HTML entity decoding).
- Build/test/tsconfig mirror `packages/css` exactly: tsup, Vitest, TS project references, and the
  same source-resolution pattern for workspace deps (a `paths` mapping in `tsconfig.test.json` and a
  Vitest `resolve.alias`) so typecheck and tests run against dom/css **source** without a prebuild.

## Render model — node taxonomy (the contract `@scope/react-native` consumes)

```ts
type RenderNode = BlockNode | InlineContainerNode | InlineNode | TextNode | LineBreakNode

interface BlockNode {
  // display: block | list-item
  type: 'block'
  tag: string // p div h1–h6 ul ol li blockquote pre hr (+ unknown blocks)
  style: RNStyle
  attribs: Record<string, string>
  marker?: ListMarker // present on <li>
  children: Array<BlockNode | InlineContainerNode>
  key: string
}

interface InlineContainerNode {
  // anonymous run-wrapper → renders to ONE <Text>
  type: 'inline-container'
  style: RNStyle // the owning block's text style
  children: Array<InlineNode | TextNode | LineBreakNode>
  key: string
}

interface InlineNode {
  // display: inline (+ inline-block, as a v1 simplification)
  type: 'inline'
  tag: string // b strong i em u s span code a (+ unknown inlines)
  style: RNStyle
  attribs: Record<string, string> // href on <a>
  children: Array<InlineNode | TextNode | LineBreakNode>
  key: string
}

interface TextNode {
  type: 'text'
  text: string
  key: string
} // entity-decoded + collapsed
interface LineBreakNode {
  type: 'linebreak'
  key: string
} // from <br>

interface ListMarker {
  ordered: boolean
  index: number // 1-based within its direct list
  listStyleType: string
  text: string // resolved marker, e.g. '•' or '1.'
}
```

`buildRenderTree(document, styles) → Array<BlockNode | InlineContainerNode>`. The document root is
itself a block context, so top-level inline runs group into inline-containers and top-level blocks
become `BlockNode`s. Every node carries a deterministic, path-based `key` (e.g. `"0.1.2"`) for the
renderer's React keys.

**How 2b will map it** (records the contract's intent; not part of this sub-project):
`BlockNode` → `registry[tag]` or a default `<View>` (`li` renders its `marker` + content; `hr` a
rule; `pre` preserves); `InlineContainerNode` → one `<Text style>`; `InlineNode` → `registry[tag]`
or a nested `<Text>` (`a` wraps an `onPress` → `onLinkPress(href)`); `TextNode` → the string;
`LineBreakNode` → `'\n'`.

## Stage 1 — Prune & classify

- Drop comments, elements with computed `display: none`, and **non-rendered tags**:
  `head style script title meta link base noscript`.
- Classify each remaining element by computed `display`: **block-level** = `block | list-item`;
  **inline-level** = `inline | inline-block`. `inline-block`'s box semantics are a deliberate v1
  simplification — it flows as inline (renders inside a `<Text>`); flagged for a later refinement.

## Stage 2 — Split (block/inline structural transform)

For a block element, walk its child nodes in order, accumulating an **inline run**:

- text node or inline-level element → append to the current run;
- block-level element → flush the current run into an `InlineContainerNode` (if non-empty), then
  append the recursively-built child `BlockNode`;
- at the end, flush the trailing run.

A block whose children are all inline yields a single `InlineContainerNode` child. Inside a run:
inline elements → `InlineNode` (recursed), text → `TextNode` (raw text; decoded/collapsed in
Stage 3), `<br>` → `LineBreakNode`. Invalid block-inside-inline content is flattened to inline for
v1 (noted as an edge). `InlineContainerNode.style` = the owning block's computed `RNStyle`, so its
wrapping `<Text>` carries the block's text style and inline children layer their own styles on top.

The document root is treated as a block context, yielding `Array<BlockNode | InlineContainerNode>`.

## Stage 3 — Text (entity decode + whitespace collapse)

Runs per `InlineContainerNode` (a complete inline run whose edges are block boundaries):

- **Decode** each `TextNode`'s raw text via `entities` (`decodeHTML`) — named + numeric. Done
  **before** collapse so `&nbsp;` → U+00A0, which collapse treats as **non-collapsible**.
- **Collapse** per the owning block's computed `white-space`:
  - `normal` / `nowrap` → collapse runs of collapsible whitespace (space, tab, newline, CR — not
    U+00A0) to a single space; trim at the container's leading/trailing edges; collapse **across
    inline-element boundaries** (`<b>a </b> b` → `a b`). Implemented as one left-to-right pass over
    the container's text leaves carrying a "previous char was collapsible whitespace" flag across
    node boundaries.
  - `pre` / `pre-wrap` → preserve whitespace and newlines; `pre-line` → collapse spaces/tabs, keep
    newlines.
- After collapse, **drop empty `TextNode`s**, and **drop any `InlineContainerNode` left with no
  children**. This is what makes inter-block source whitespace (the newlines/indentation between
  `</p>` and `<p>`) disappear instead of rendering empty `<Text>`s.

## Stage 4 — List markers

Walk the tree; for each `ul`/`ol` `BlockNode`, number its **direct** `li` children `1..n`. Each
`li` gets `marker = { ordered: parent is ol, index, listStyleType (from computed control), text }`.
Resolve `text`: unordered `disc → '•'`, `circle → '◦'`, `square → '▪'`, `none → ''`; ordered
`decimal → "${index}."`. Flat per-list counting (each list counts its own direct items;
restart is automatic per list). `lower-alpha` / `lower-roman` / `start` and deep-nesting refinements
fall back to `decimal` and are completed in Phase 3.

## Edge handling

- `display: none` and non-rendered tags dropped; comments dropped.
- **Unknown tags** (outside the v1 set) are kept, classified by computed `display` (default inline
  per the CSS initial value), and their children rendered — content is never lost; 2b's default
  block/inline renderer handles them.
- Empty post-collapse inline-containers dropped.

## Public API

```ts
import type { Document, Element } from '@yk-yong/rn-rich-text-dom'
import type { ComputedStyle } from '@yk-yong/rn-rich-text-css'

function buildRenderTree(
  document: Document,
  styles: Map<Element, ComputedStyle>,
): Array<BlockNode | InlineContainerNode>
```

Plus exported node types (`RenderNode` and each interface, `ListMarker`). Core stays focused on
`(document, styles) → tree`; `@scope/react-native` orchestrates `parse → resolveStyles →
buildRenderTree → render`.

## Testing strategy (TDD — Red → Green → Refactor; no snapshots)

Per-stage unit tests:

- **prune** — `display:none` removed; non-rendered tags removed; comments removed.
- **split** — mixed block+inline children, nested inline, `<br>`, only-inline blocks, inline-
  container creation, document-root grouping.
- **text** — entity decode (named + numeric + `nbsp`); collapse for `normal` / `pre` / `pre-line`;
  leading/trailing trim; cross-inline-boundary collapse; `nbsp` preserved; empty `TextNode` drop;
  inter-block whitespace dropped.
- **markers** — `ul` disc bullets; `ol` decimal indices; `listStyleType` honored; per-list counting.

Plus end-to-end fixtures: `dom.parse(html) → css.resolveStyles → buildRenderTree`, asserting tree
shape and final text. Extend the real-world HTML corpus from Phase 1.

## Deliverable

A tested, React-free `@yk-yong/rn-rich-text-core` package exposing `buildRenderTree(document,
styles)` that returns the renderer-agnostic styled tree (block/inline split, whitespace-collapsed
and entity-decoded text, basic list markers), with green CI. No rendering.

## Out of scope (this sub-project)

The actual RN rendering (`@scope/react-native`, sub-project 2b); nested list counters / letters /
roman / `start` / restart (Phase 3); tables (Phase 4); `img` (Phase 3); `inline-block` box
semantics (flows as inline in v1); bidirectional text / RTL / CSS `direction`.

## Open questions (resolve during planning)

- Exact `key` scheme (path indices vs a counter) and whether keys are stable across re-renders.
- Whether `<br>` inside a `pre` needs distinct handling from a literal newline.
- The precise `non-rendered tags` set and whether to drive it from a computed-`display:none` UA rule
  in `@scope/css` instead of a hard-coded list in core.
- Whether `buildRenderTree` should accept the css `ResolveResult` directly (for diagnostics
  pass-through) rather than just the `styles` map.

# rn-rich-text — Architecture & Phase 0 Design

Date: 2026-06-09
Status: Draft for review
Working name: `rn-rich-text` (repo + npm scope are placeholders; rename freely)

## What this is

A modern, **Fabric-native** HTML renderer for React Native, intended to grow into a
full, community-maintained replacement for `react-native-render-html` (which is heavy,
lightly maintained, and not New-Architecture-first). It lives in its own standalone
public monorepo at `repositories/rn-rich-text`, independent of any consuming app.

It originated from a small in-app seed (`@packages/rich-text` in the fonerewards
mobile app) that validated the rendering model. This library is a **clean-room build on
the htmlparser2/css ecosystem** — the seed's parser and entity decoder are superseded,
but its rendering concepts carry straight over (see "Relationship to the seed").

## Decisions (the four pillars)

| Decision | Choice | Consequence |
| --- | --- | --- |
| Positioning | Full `react-native-render-html` replacement, shipped incrementally | Architecture must scale to the full surface (tables, images, custom renderers) |
| Platform | **New Architecture (Fabric) only**; bare RN + Expo; no web in v1 | Simpler internals (no Paper interop); richer CSS→RN prop mapping; "Fabric-native + maintained" is the headline pitch |
| CSS engine | **Full**: inline + tag/class maps + `<style>` blocks + selectors + specificity/cascade/inheritance | Real CSS subsystem from v1; de-risked because the selector engine already exists |
| Home | New standalone multi-package monorepo; consuming apps link locally | Clean OSS governance/CI/semver from day one |

## Substrate — stand on proven libs, own the orchestration

The hard, edge-case-heavy substrate is already proven and largely present in the
ecosystem (verified in the seed app's `node_modules`, pulled in transitively via
`react-native-svg`):

| Layer | Library | Role | Status |
| --- | --- | --- | --- |
| HTML → DOM | `htmlparser2` → `domhandler` | Forgiving parse to a queryable DOM | **add** htmlparser2; domhandler proven |
| Selector matching | `css-select` + `domutils` | Match `.cls #id div p ul>li` against the DOM | proven (no adapter needed) |
| CSS / `<style>` parse | `css-tree` | Parse stylesheets + inline declarations + selector ASTs | proven |
| Specificity | `@csstools/selector-specificity` (or hand-rolled from the selector AST) | Order matched rules | small/known |
| Declaration → RN style | `css-to-react-native` | Expand shorthands, parse units/colors → RN style object | **add** |
| Entity decoding | `entities` | Complete HTML entity decode | proven |
| Layout | **Yoga** (native, in Fabric) | Flexbox box model | free with RN |

We own: the cascade/inheritance orchestration, the RN-specific property whitelist (tuned
to Fabric's expanded prop set — `boxShadow`, `filter`, `gap`, `aspectRatio`, … where
supported), the user-agent stylesheet, the block/inline render model, and the public API.
New direct deps are only `htmlparser2` and `css-to-react-native`; the rest are promotions
of already-proven ecosystem packages.

> Note: Yoga gives layout for free, but there is **no native CSS *interpretation* engine** —
> parsing, cascade, selectors, color/unit handling all run in JS. "Going Fabric" helps only
> by widening the set of CSS properties that map faithfully to RN.

## Rendering pipeline

```
HTML ─▶ [1] Parse        htmlparser2 → domhandler DOM (forgiving, malformed-tolerant)
     ─▶ [2] Collect CSS  css-tree parses <style> blocks + inline style attrs; merge with
                         consumer baseStyle/tagStyles/classStyles + a built-in UA stylesheet
     ─▶ [3] Resolve       per node: match selectors (css-select), order by specificity
            (cascade)     (UA < tag < class < <style> < inline), apply inheritance for
                          inherited props, map declarations → RN style (css-to-react-native)
                          ⇒ a styled render tree
     ─▶ [4] Render        walk styled tree → RN elements via a renderer registry;
                          Yoga lays it out natively
```

**Stage 4 carries the seed's logic, generalized:**
- **Inline context** (`b/strong i/em u s span code a` …) → nested `<Text>`.
- **Block context** (`p div ul ol li blockquote h1–h6 pre hr table` …) → `<View>`/`<Text>`,
  honoring the "no `<View>` inside `<Text>`" constraint via the block/inline split (the
  seed's core insight, now driven by computed `display`).
- Whitespace collapse, entity decode (via `entities`), and **per-weight/style font
  resolution** (the Montserrat insight — emphasis selects a font *file*, configurable).

*Rejected alternatives:* no-DOM/regex (cannot do selectors), WebView (defeats native perf/UX).

## Monorepo packages

Each package is independently testable and tree-shakeable; the three lower packages are
**React-free** (pure logic — where the edge cases live, so they get exhaustive unit tests).

- **`@scope/dom`** — htmlparser2 wrapper → DOM + traversal utilities. No React, no RN.
- **`@scope/css`** — the engine: parse, selector match, specificity, cascade, inheritance,
  declaration→RN mapping, UA stylesheet. Produces RN style objects; no React.
- **`@scope/core`** — styled-render-tree builder (DOM + resolved styles → render model). No React.
- **`@scope/react-native`** — the public package: `<RichText>`, renderer registry, props/hooks.

## Public API (target surface)

```tsx
<RichText
  source={{ html }}
  baseStyle={{ ... }}
  tagStyles={{ p: { ... }, a: { ... } }}
  classStyles={{ note: { ... } }}
  renderers={{ img: MyImage, a: MyLink }}   // registry — override/extend any tag
  fonts={montserratFaces}                    // per-weight/style font resolution
  onLinkPress={(href) => ...}
/>
```

The `renderers` registry is the extensibility model that made `react-native-render-html`
popular — here it is the clean, typed core.

## Phasing (multi-quarter; each phase = its own spec → plan → implement cycle)

- **Phase 0 — Foundation + `@scope/dom`** (this spec's detailed sub-project): monorepo
  scaffold (workspaces, TS project refs, lint/format, CI, MIT license, example app stub),
  plus the `@scope/dom` package: `parse(html) → DOM`, traversal/query helpers, types.
  Deliverable: a tested, React-free HTML→DOM package and a green CI pipeline.
- **Phase 1 — `@scope/css` engine**: parse, selector match, specificity, cascade,
  inheritance, declaration→RN mapping, UA stylesheet. Deliverable: `HTML + CSS → resolved
  RN styles per node`, no rendering.
- **Phase 2 — `@scope/core` + `@scope/react-native` (v1 render)**: styled-tree builder,
  inline/block renderers for the core tag set, renderer registry, `<RichText>` API, font
  resolution, `onLinkPress`. **Dogfood**: replace the app seed in `OutletAboutScreen` via
  local link. Deliverable: usable renderer, first published canary.
- **Phase 3 — Images & list/quote polish**: `img` → `<Image>`, `hr`, `pre/code`, nested
  list counters, `blockquote`.
- **Phase 4 — Tables**.
- **Phase 5+ — Docs site, expanded example app, advanced CSS, accessibility, 1.0 publish.**

### v1 (Phases 0–2) tag set

Inline: `b strong i em u s span code br a`.
Block: `p div h1–h6 ul ol li blockquote pre hr`.
CSS: inline + `tagStyles` + `classStyles` + `<style>` + selectors + specificity + cascade + inheritance.

### Out of scope for v1

Tables, images, forms/inputs, media (audio/video/iframe), `react-native-web`, pseudo-elements,
CSS animations/transitions, `@media`/`@supports`. (Tables and images are Phases 3–4.)

## Phase 0 — detailed design (the first implementable sub-project)

**Monorepo scaffold:**
- Package manager: npm or pnpm workspaces (decide in plan); TypeScript with project
  references; ESLint + Prettier; Vitest/Jest for unit tests; tsup/bob for builds.
- `packages/dom` only in Phase 0; other package dirs created as their phases begin.
- `example/` Expo or bare RN app stub (wired in Phase 2).
- Infra: MIT `LICENSE`, `README`, `CONTRIBUTING`, Conventional Commits, Changesets for
  versioning, GitHub Actions CI (lint + typecheck + test on PR).
- RN support: New Architecture only; declare RN/React peer-dependency floors (exact
  versions decided in plan, ≥ the New-Arch-stable line); Expo supported.

**`@scope/dom` API:**
```ts
parse(html: string): Document            // htmlparser2 → domhandler tree
// re-export/curate domutils query helpers: getElementsByTagName, selectAll(sel), etc.
// typed node guards: isTag, isText, isComment
```
Forgiving parsing (malformed HTML tolerated). No CSS, no React. Exhaustive unit tests:
nesting, void elements, attributes, malformed input, entities left raw (decoded later in
the css/render layer or via `entities` at text-render time).

## Relationship to the seed (`@packages/rich-text` in the app)

The seed stays in the app as a working shim until Phase 2 dogfooding replaces it. What
**carries over** (concepts, re-implemented on the new substrate): block/inline split,
emphasis resolution, whitespace collapse, theme-agnostic prop API, per-weight font
resolution. What is **superseded**: `html-parse-stringify` (→ htmlparser2/domhandler),
the hand-rolled entity decoder (→ `entities`), the flat AST (→ a queryable DOM).

## Testing strategy

- React-free packages (`dom`, `css`, `core`): exhaustive unit tests in isolation — the bulk
  of correctness coverage lives here (parser edge cases, cascade/specificity tables,
  shorthand expansion, inheritance).
- `react-native`: component tests via react-test-renderer asserting structure/styles
  (mirroring the seed's approach); snapshot-free.
- A fixtures corpus of real-world HTML (incl. CMS/Wikipedia-style markup) rendered through
  the full pipeline as integration tests.
- CI gates: lint + typecheck + tests on every PR.

## Infra & governance

MIT license. Conventional Commits + Changesets + automated releases. Semver. Public GitHub
repo with issue/PR templates and a `CONTRIBUTING` guide. Final library/npm name TBD by the
maintainer (placeholder `rn-rich-text`).

## Open questions (resolve during planning)

- npm vs pnpm workspaces; build tool (tsup vs react-native-builder-bob).
- Exact RN/React peer-dependency floors (New-Arch-stable line).
- Final package scope/name and npm org.
- Whether `img` lands in v1 (Phase 2) or Phase 3.

# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project Overview

`rn-rich-text` (working name — repo/npm scope are placeholders, rename freely) is a modern,
**Fabric-native HTML renderer for React Native**, built to grow into a full,
community-maintained replacement for `react-native-render-html` (which is heavy, lightly
maintained, and not New-Architecture-first).

It originated from an in-app seed (`@packages/rich-text` in the fonerewards mobile app) that
validated the rendering model. This is a **clean-room build on the htmlparser2/css ecosystem** —
the seed's parser/entity-decoder are superseded; its rendering *concepts* carry over.

## Status

Design phase. The architecture + Phase 0 design is committed at
`docs/specs/2026-06-09-architecture-and-phase-0-design.md` — **read it first**. No package code
exists yet; **Phase 0** (monorepo scaffold + `@scope/dom`) is the next implementation step.

## Key Decisions — do NOT re-litigate

| Decision | Choice |
| --- | --- |
| Positioning | Full `react-native-render-html` replacement, shipped **incrementally** |
| Platform | **New Architecture (Fabric) only** · bare RN + Expo · **no web** in v1 |
| CSS engine | **Full** from v1: inline + tag/class maps + `<style>` blocks + selectors + specificity/cascade/inheritance |
| Home | Standalone multi-package monorepo; consuming apps **link locally** during dev |

## Architecture

Browser-shaped pipeline:

```
HTML ─▶ [1] Parse        htmlparser2 → domhandler DOM (forgiving)
     ─▶ [2] Collect CSS  css-tree parses <style> + inline; merge consumer
                         baseStyle/tagStyles/classStyles + a built-in UA stylesheet
     ─▶ [3] Resolve       match selectors (css-select), order by specificity
            (cascade)     (UA < tag < class < <style> < inline), apply inheritance,
                          map declarations → RN style (css-to-react-native) ⇒ styled tree
     ─▶ [4] Render        styled tree → RN elements via a renderer registry; Yoga lays out
```

Stage 4 carries the seed's logic, generalized: inline context (`b/i/a/span/code…`) → nested
`<Text>`; block context (`p/div/ul/li/h*/blockquote…`) → `<View>`/`<Text>` via the "no `<View>`
inside `<Text>`" split (driven by computed `display`); whitespace collapse; entity decode (via
`entities`); **per-weight/style font resolution** (the Montserrat insight — emphasis selects a
font *file*, configurable via a `fonts` prop).

*Rejected:* no-DOM/regex (no selectors), WebView (defeats native perf).

## Packages (monorepo)

Lower three are **React-free pure logic** (where the edge cases live → exhaustive unit tests):

- `@scope/dom` — htmlparser2 → DOM + traversal utils. No React/RN.
- `@scope/css` — parse, selector match, specificity, cascade, inheritance, declaration→RN
  mapping, UA stylesheet. Produces RN style objects; no React.
- `@scope/core` — styled-render-tree builder (DOM + styles → render model). No React.
- `@scope/react-native` — public package: `<RichText>`, renderer registry, props/hooks.

Public API target:

```tsx
<RichText
  source={{ html }}
  baseStyle={{ ... }}
  tagStyles={{ p: { ... }, a: { ... } }}
  classStyles={{ note: { ... } }}
  renderers={{ img: MyImage, a: MyLink }}   // override/extend any tag
  fonts={montserratFaces}
  onLinkPress={(href) => ...}
/>
```

## Dependency substrate

Stand on proven libs; own the orchestration. New direct deps are only **`htmlparser2`** and
**`css-to-react-native`**; the rest are proven ecosystem packages.

| Layer | Library | Status |
| --- | --- | --- |
| HTML → DOM | `htmlparser2` → `domhandler` | add htmlparser2 |
| Selector matching | `css-select` + `domutils` | proven (no adapter) |
| CSS / `<style>` parse | `css-tree` | proven |
| Specificity | `@csstools/selector-specificity` or hand-rolled | small/known |
| Declaration → RN style | `css-to-react-native` | add |
| Entity decoding | `entities` | proven |
| Layout | Yoga (native, Fabric) | free with RN |

There is **no native CSS *interpretation* engine** — parse/cascade/selectors/colors/units all
run in JS. Fabric only helps by widening which CSS props map faithfully to RN (`boxShadow`,
`filter`, `gap`, `aspectRatio`, … where supported).

## Phasing

Each phase = its own spec → plan → implement cycle.

- **Phase 0** — monorepo scaffold + `@scope/dom` (tested, React-free) + green CI. ← next
- **Phase 1** — `@scope/css` engine (HTML+CSS → resolved RN styles per node).
- **Phase 2** — `@scope/core` + `@scope/react-native` v1 render; dogfood by replacing the app
  seed in `OutletAboutScreen` via local link; first published canary.
- **Phase 3** — images (`img`), `hr`, `pre/code`, nested lists, `blockquote`.
- **Phase 4** — tables.
- **Phase 5+** — docs site, example app, advanced CSS, accessibility, 1.0 publish.

**v1 (Phases 0–2) tag set:** inline `b strong i em u s span code br a`; block
`p div h1–h6 ul ol li blockquote pre hr`. **Out of scope v1:** tables, images, forms, media,
react-native-web, pseudo-elements, animations, `@media`/`@supports`.

## Conventions

- **TDD mandatory** — test-first (Red → Green → Refactor). React-free packages get exhaustive
  unit tests; `react-native` gets react-test-renderer structure/style assertions; no snapshots.
- **New Architecture only** — do not add Paper/old-arch interop.
- **Lower packages stay React-free** — `dom`/`css`/`core` must not import React or RN components
  (they may import RN *types* / produce RN style objects). Keeps them testable and reusable.
- **Strict TypeScript**, no `any`.
- **Conventional Commits** + Changesets for versioning. MIT license.
- Maintain a fixtures corpus of real-world HTML (CMS/Wikipedia-style) for integration tests.

## Open questions (resolve in planning)

npm vs pnpm workspaces; build tool (tsup vs react-native-builder-bob); exact RN/React peer
floors (New-Arch-stable line); final package scope/name; whether `img` lands in v1 (Phase 2) or
Phase 3.

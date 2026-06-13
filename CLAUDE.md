# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project Overview

`react-native-richtext` (published as `@yk-yong/react-native-richtext`) is a modern,
**Fabric-native HTML renderer for React Native**, built to grow into a full,
community-maintained replacement for `react-native-render-html` (which is heavy, lightly
maintained, and not New-Architecture-first).

It originated from an in-app seed (`@packages/rich-text` in the fonerewards mobile app) that
validated the rendering model. This is a **clean-room build on the htmlparser2/css ecosystem** —
the seed's parser/entity-decoder are superseded; its rendering _concepts_ carry over.

## Status

**0.1.0 release-prep + dogfood** (branch `release-prep-and-dogfood`). Phases 0–3b are implemented:
all four packages are built and tested (`packages/{dom,css,core,react-native}`, each at `0.1.0`),
with an Expo example app in `example/`. Current work: cut the **0.1.0 release**
(`docs/release-0.1.0-runbook.md`) and dogfood into the fonerewards app
(`docs/dogfood-migration-plan.md`).

Specs + plans live in `docs/specs/` and `docs/plans/` (one pair per phase, 0 → 3b); per-phase
follow-ups in `docs/phase-*-followups.md`. Architecture spec:
`docs/specs/2026-06-09-architecture-and-phase-0-design.md` — **read it first**.

## Commands

pnpm only (`preinstall` enforces it via `only-allow`). Node ≥ 20.18, pnpm 11.5.2.

```bash
pnpm install
pnpm build          # tsup per-package, then tsc -b project refs
pnpm test           # vitest run (all packages) · test:watch · test:coverage
pnpm typecheck      # tsc per package
pnpm lint           # eslint .   (lint:fix to autofix)
pnpm format         # prettier --write .   (format:check to verify)
pnpm changeset      # record a user-facing change
pnpm release        # build + changeset publish (CI → GitHub Packages)
```

## Key Decisions — do NOT re-litigate

| Decision    | Choice                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Positioning | Full `react-native-render-html` replacement, shipped **incrementally**                                     |
| Platform    | **New Architecture (Fabric) only** · bare RN + Expo · **no web** in v1                                     |
| CSS engine  | **Full** from v1: inline + tag/class maps + `<style>` blocks + selectors + specificity/cascade/inheritance |
| Home        | Standalone multi-package monorepo; consuming apps **link locally** during dev                              |

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
font _file_, configurable via a `fonts` prop).

_Rejected:_ no-DOM/regex (no selectors), WebView (defeats native perf).

## Packages (monorepo)

Lower three are **React-free pure logic** (where the edge cases live → exhaustive unit tests).
Published under the `@yk-yong/` scope:

- `@yk-yong/react-native-richtext-dom` — htmlparser2 → DOM + traversal utils. No React/RN.
- `@yk-yong/react-native-richtext-css` — parse, selector match, specificity, cascade,
  inheritance, declaration→RN mapping, UA stylesheet. Produces RN style objects; no React.
- `@yk-yong/react-native-richtext-core` — styled-render-tree builder (DOM + styles → render
  model). No React.
- `@yk-yong/react-native-richtext` — public package: `<RichText>`, renderer registry, props/hooks.

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

| Layer                  | Library                                         | Status              |
| ---------------------- | ----------------------------------------------- | ------------------- |
| HTML → DOM             | `htmlparser2` → `domhandler`                    | add htmlparser2     |
| Selector matching      | `css-select` + `domutils`                       | proven (no adapter) |
| CSS / `<style>` parse  | `css-tree`                                      | proven              |
| Specificity            | `@csstools/selector-specificity` or hand-rolled | small/known         |
| Declaration → RN style | `css-to-react-native`                           | add                 |
| Entity decoding        | `entities`                                      | proven              |
| Layout                 | Yoga (native, Fabric)                           | free with RN        |

There is **no native CSS _interpretation_ engine** — parse/cascade/selectors/colors/units all
run in JS. Fabric only helps by widening which CSS props map faithfully to RN (`boxShadow`,
`filter`, `gap`, `aspectRatio`, … where supported).

## Phasing

Each phase = its own spec → plan → implement cycle.

- **Phase 0** ✅ — monorepo scaffold + `dom` (tested, React-free) + green CI.
- **Phase 1** ✅ — `css` engine (HTML+CSS → resolved RN styles per node).
- **Phase 2** ✅ — `core` + `react-native` v1 render; Expo `example/` app; dogfood by replacing
  the app seed in `OutletAboutScreen` via local link.
- **Phase 3** ✅ — split into **3a** (`img`) and **3b** (`hr`, `pre/code`, nested lists,
  `blockquote`, polish).
- **Phase 4** — tables. ← next
- **Phase 5+** — docs site, advanced CSS, accessibility, 1.0 publish.

**v1 (Phases 0–2) tag set:** inline `b strong i em u s span code br a`; block
`p div h1–h6 ul ol li blockquote pre hr`. **Out of scope v1:** tables, images, forms, media,
react-native-web, pseudo-elements, animations, `@media`/`@supports`.

## Conventions

- **TDD mandatory** — test-first (Red → Green → Refactor). React-free packages get exhaustive
  unit tests; `react-native` gets react-test-renderer structure/style assertions; no snapshots.
- **New Architecture only** — do not add Paper/old-arch interop.
- **Lower packages stay React-free** — `dom`/`css`/`core` must not import React or RN components
  (they may import RN _types_ / produce RN style objects). Keeps them testable and reusable.
- **Strict TypeScript**, no `any`.
- **Conventional Commits** + Changesets for versioning. MIT license.
- Maintain a fixtures corpus of real-world HTML (CMS/Wikipedia-style) for integration tests.

## Resolved (were open questions)

- **Workspaces:** pnpm (`pnpm-workspace.yaml`, `only-allow pnpm`).
- **Build tool:** tsup per package + `tsc -b` project references (not builder-bob).
- **Peer floors:** Node ≥ 20.18; `react` ≥ 18.2.0, `react-native` ≥ 0.74.0 (New-Arch-stable line).
- **Package scope:** `@yk-yong/react-native-richtext{,-dom,-css,-core}`.
- **`img`:** shipped in its own **Phase 3a**, not v1.

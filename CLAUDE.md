# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project Overview

`react-native-richtext` (published as `@quanta-studio/react-native-richtext`) is a modern,
**Fabric-native HTML renderer for React Native**, built to grow into a full,
community-maintained replacement for `react-native-render-html` (which is heavy, lightly
maintained, and not New-Architecture-first).

It originated from an in-app seed (`@packages/rich-text` in the fonerewards mobile app) that
validated the rendering model. This is a **clean-room build on the htmlparser2/css ecosystem** —
the seed's parser/entity-decoder are superseded; its rendering _concepts_ carry over.

## Docs & phasing

Each phase = its own spec → plan → implement cycle. Specs + plans live in `docs/specs/` and `docs/plans/` (one pair per phase); per-phase
follow-ups in `docs/phase-*-followups.md`. Architecture spec:
`docs/specs/2026-06-09-architecture-and-phase-0-design.md` — **read it first**.

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

## CSS runtime

There is **no native CSS _interpretation_ engine** — parse/cascade/selectors/colors/units all
run in JS. Fabric only helps by widening which CSS props map faithfully to RN (`boxShadow`,
`filter`, `gap`, `aspectRatio`, … where supported).

## Conventions

- **TDD mandatory** — test-first (Red → Green → Refactor). React-free packages get exhaustive
  unit tests; `react-native` gets react-test-renderer structure/style assertions; no snapshots.
- **New Architecture only** — do not add Paper/old-arch interop.
- **Lower packages stay React-free** — `dom`/`css`/`core` must not import React or RN components
  (they may import RN _types_ / produce RN style objects). Keeps them testable and reusable.
- **Strict TypeScript**, no `any`.
- **Conventional Commits** + Changesets for versioning. MIT license.
- Maintain a fixtures corpus of real-world HTML (CMS/Wikipedia-style) for integration tests.

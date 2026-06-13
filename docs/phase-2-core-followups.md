# Phase 2a (`@scope/core`) — deferred follow-ups

The Phase 2a deliverable — a tested, React-free `@yk-yong/rn-rich-text-core` whose
`buildRenderTree(document, styles)` returns the renderer-agnostic styled tree (block/inline split,
whitespace collapse, entity decode, basic list markers) — is complete and green (lint + format +
typecheck + tests + build). The items below were surfaced during implementation/review. **None are
blockers.**

## 1. Whitespace around `<br>` is not browser-exact

The whitespace-collapse review found two minor divergences from strict CSS, both involving `<br>`:

- **Whitespace before a `<br>` is not removed.** `x<br>` with `x ` (trailing space) keeps one space
  before the break (`['x', ' ', <br>]`). Browsers trim trailing whitespace before a forced break.
- **A trailing space on the content leaf before a `<br>` is preserved.** `a <br>` keeps the space
  on `'a '`. The spec deliberately stops the trailing-trim at a trailing `<br>`, so this is
  by-design for v1, but diverges from browser rendering.

Neither produces a double space or corrupts `&nbsp;` (U+00A0), and lone-`<br>` containers are kept.
**When revisited:** add a "trim collapsible whitespace immediately before each `<br>`" pass in
`text/collapse.ts` and fixtures covering `a <br> b`. Tracked for a later sub-phase.

## 2. Performance: three traversals per inline-container

`text/process-text.ts` walks each container's inline subtree three times per container
(`collectLeaves`, then `pruneEmptyText`, then `hasContent`). Fine for v1 correctness/clarity; if
profiling ever flags it, fuse the prune + content check into a single pass.

## 3. v1 simplifications carried from the spec (intentional)

- `inline-block` flows as inline (renders inside a `<Text>`); its box semantics are deferred.
- List markers are flat single-level counters; `lower-alpha`/`lower-roman`/`start`/restart and
  deep-nesting counters are Phase 3.
- Invalid block-inside-inline content is flattened to inline.
- The non-rendered-tag set is a hard-coded list in `classify.ts`; it could instead be driven by a
  `display:none` UA rule in `@scope/css`.

## 4. UA stylesheet completeness (handled, noted for tracking)

The core integration test surfaced that the css UA stylesheet lacked the HTML5 sectioning/grouping
elements, so they fell back to inline. Fixed in this branch (`article`/`section`/`aside`/`header`/
`footer`/`main`/`nav`/`figure`/`figcaption` → `display: block`). Other less-common block elements
(`address`, `fieldset`, `details`, `dl`/`dt`/`dd`, `table`\*) can be added as their tags enter scope
(`table` lands in Phase 4).

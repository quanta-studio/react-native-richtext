# @yk-yong/react-native-richtext-core

## 0.2.0

### Minor Changes

- f7558b5: Add Phase 4a table rendering: `<table>` (with `thead`/`tbody`/`tfoot`/`tr`/`td`/`th`/`caption`), `colspan`/`rowspan` resolved in a normalized core grid, nested tables, and a deterministic weighted-column renderer. `colspan` widens cells via flex weight; `rowspan` is modeled in the grid and rendered flat with filler cells (true vertical spanning and content-proportional column widths arrive in Phase 4b). `th` is bold/centered; `<table border>` shows grid lines; `table`/`tr`/`td`/`th` are overridable via the `renderers` prop.

### Patch Changes

- Updated dependencies [c8e6732]
- Updated dependencies [f7558b5]
  - @yk-yong/react-native-richtext-css@0.2.0

## 0.1.0

### Minor Changes

- 721df22: Add the render-model builder: `buildRenderTree(document, styles)` turns a parsed DOM plus
  per-element computed styles into a renderer-agnostic styled tree — the block/inline split (the
  "no View inside Text" rule, driven by computed `display`), whitespace collapse, entity decode,
  and basic list markers. React-free; consumed by `@scope/react-native` in the next phase.
- e01df31: List/quote/code polish: ordered lists render `a.`/`i.`/`A.`/`I.` markers (lower/upper alpha + roman) and
  honor the `<ol start>`, `<ol type>`, and `<li value>` attributes; `blockquote` gets a left border; `pre`
  scrolls horizontally so long lines no longer wrap or clip.

### Patch Changes

- Updated dependencies [721df22]
- Updated dependencies [fa86e21]
- Updated dependencies [cf86763]
- Updated dependencies [64c5d21]
- Updated dependencies [e01df31]
  - @yk-yong/react-native-richtext-css@0.1.0
  - @yk-yong/react-native-richtext-dom@0.1.0

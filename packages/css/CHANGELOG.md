# @quanta-studio/react-native-richtext-css

## 0.2.1

### Patch Changes

- 4167c49: Fix nested text decorations being lost. When elements with different `text-decoration-line` values nest (e.g. `<u>` inside `<strike>`), the inner text now correctly shows **both** lines (`underline line-through`) instead of only the innermost. `text-decoration-line` is now accumulated (unioned) down the element tree, matching browser behavior — React Native honors only one decoration per `<Text>`, so the combined value is computed during the cascade.

## 0.2.0

### Minor Changes

- f7558b5: Add Phase 4a table rendering: `<table>` (with `thead`/`tbody`/`tfoot`/`tr`/`td`/`th`/`caption`), `colspan`/`rowspan` resolved in a normalized core grid, nested tables, and a deterministic weighted-column renderer. `colspan` widens cells via flex weight; `rowspan` is modeled in the grid and rendered flat with filler cells (true vertical spanning and content-proportional column widths arrive in Phase 4b). `th` is bold/centered; `<table border>` shows grid lines; `table`/`tr`/`td`/`th` are overridable via the `renderers` prop.

### Patch Changes

- c8e6732: Fix `<del>`, `<strike>`, and `<ins>` rendering without their text-decoration. The UA stylesheet covered only `<s>`/`<u>`; add the missing aliases so `<del>`/`<strike>` render with `line-through` and `<ins>` with `underline`, matching browser defaults.

## 0.1.0

### Minor Changes

- cf86763: Add the CSS engine: `resolveStyles(document, options)` resolves a parsed DOM plus
  consumer baseStyle/tagStyles/classStyles, `<style>` blocks, and inline styles into a
  fully-computed RN style per element (cascade, specificity, inheritance, relative-unit
  resolution, UA stylesheet), with optional diagnostics.

### Patch Changes

- 721df22: UA stylesheet: add the HTML5 sectioning/grouping elements (`article`, `section`, `aside`,
  `header`, `footer`, `main`, `nav`, `figure`, `figcaption`) as `display: block`. Without this they
  fell back to the CSS initial `inline`, which collapsed sectioned CMS markup into a single inline run.
- 64c5d21: Render `<img>` as a native React Native `<Image>`: explicit `width`/`height` are honored, dimensionless
  images are sized to their intrinsic aspect ratio (fetched via `Image.getSize`) and capped to the
  container, and `alt` is surfaced as `accessibilityLabel`. The `img` renderer is overridable via the
  `renderers` prop. (css: the UA stylesheet now makes `img` `display: block`.)
- e01df31: List/quote/code polish: ordered lists render `a.`/`i.`/`A.`/`I.` markers (lower/upper alpha + roman) and
  honor the `<ol start>`, `<ol type>`, and `<li value>` attributes; `blockquote` gets a left border; `pre`
  scrolls horizontally so long lines no longer wrap or clip.
- Updated dependencies [fa86e21]
  - @quanta-studio/react-native-richtext-dom@0.1.0

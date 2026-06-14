# @yk-yong/react-native-richtext

## 0.4.0

### Minor Changes

- 718b2aa: Phase 5a accessibility: links now announce as links (`accessibilityRole="link"`), headings (`h1`–`h6`) render with the `header` role via a new `Heading` renderer, and images expose the `image` role alongside their alt label (decorative no-alt images stay hidden from screen readers). All on by default and customizable via the `renderers` prop.

## 0.3.0

### Minor Changes

- e460b67: Phase 4b: table columns are now content-proportional. A single onLayout measurement pass sizes each column to its max-content; the table expands to fill its container when it fits and scrolls horizontally when it doesn't. Explicit `<col width>` and cell `width` are honored (and skip measurement when every column is explicit). rowspan still renders flat; border-spacing/collapse polish remains deferred.

### Patch Changes

- Updated dependencies [e460b67]
  - @yk-yong/react-native-richtext-core@0.3.0

## 0.2.0

### Minor Changes

- f7558b5: Add Phase 4a table rendering: `<table>` (with `thead`/`tbody`/`tfoot`/`tr`/`td`/`th`/`caption`), `colspan`/`rowspan` resolved in a normalized core grid, nested tables, and a deterministic weighted-column renderer. `colspan` widens cells via flex weight; `rowspan` is modeled in the grid and rendered flat with filler cells (true vertical spanning and content-proportional column widths arrive in Phase 4b). `th` is bold/centered; `<table border>` shows grid lines; `table`/`tr`/`td`/`th` are overridable via the `renderers` prop.

### Patch Changes

- c8e6732: Fix `<del>`, `<strike>`, and `<ins>` rendering without their text-decoration. The UA stylesheet covered only `<s>`/`<u>`; add the missing aliases so `<del>`/`<strike>` render with `line-through` and `<ins>` with `underline`, matching browser defaults.
- Updated dependencies [c8e6732]
- Updated dependencies [f7558b5]
  - @yk-yong/react-native-richtext-css@0.2.0
  - @yk-yong/react-native-richtext-core@0.2.0

## 0.1.0

### Minor Changes

- 4ea2fe0: Add the flagship `<RichText>` component: renders an HTML string to native React Native
  `<View>`/`<Text>` by orchestrating parse → resolveStyles → buildRenderTree and walking the
  render tree via a renderer registry, with per-weight/style font resolution (the `fonts` prop)
  and `onLinkPress`. Custom renderers override any tag via the `renderers` prop.
- 64c5d21: Render `<img>` as a native React Native `<Image>`: explicit `width`/`height` are honored, dimensionless
  images are sized to their intrinsic aspect ratio (fetched via `Image.getSize`) and capped to the
  container, and `alt` is surfaced as `accessibilityLabel`. The `img` renderer is overridable via the
  `renderers` prop. (css: the UA stylesheet now makes `img` `display: block`.)
- e01df31: List/quote/code polish: ordered lists render `a.`/`i.`/`A.`/`I.` markers (lower/upper alpha + roman) and
  honor the `<ol start>`, `<ol type>`, and `<li value>` attributes; `blockquote` gets a left border; `pre`
  scrolls horizontally so long lines no longer wrap or clip.

### Patch Changes

- Updated dependencies [721df22]
- Updated dependencies [fa86e21]
- Updated dependencies [cf86763]
- Updated dependencies [721df22]
- Updated dependencies [64c5d21]
- Updated dependencies [e01df31]
  - @yk-yong/react-native-richtext-css@0.1.0
  - @yk-yong/react-native-richtext-dom@0.1.0
  - @yk-yong/react-native-richtext-core@0.1.0

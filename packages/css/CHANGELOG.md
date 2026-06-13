# @yk-yong/react-native-richtext-css

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
  - @yk-yong/react-native-richtext-dom@0.1.0

# @yk-yong/react-native-richtext-core

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

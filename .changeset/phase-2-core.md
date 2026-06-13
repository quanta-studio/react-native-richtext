---
'@yk-yong/rn-rich-text-core': minor
---

Add the render-model builder: `buildRenderTree(document, styles)` turns a parsed DOM plus
per-element computed styles into a renderer-agnostic styled tree — the block/inline split (the
"no View inside Text" rule, driven by computed `display`), whitespace collapse, entity decode,
and basic list markers. React-free; consumed by `@scope/react-native` in the next phase.

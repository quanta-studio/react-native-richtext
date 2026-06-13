---
'@yk-yong/rn-rich-text': minor
'@yk-yong/rn-rich-text-css': patch
---

Render `<img>` as a native React Native `<Image>`: explicit `width`/`height` are honored, dimensionless
images are sized to their intrinsic aspect ratio (fetched via `Image.getSize`) and capped to the
container, and `alt` is surfaced as `accessibilityLabel`. The `img` renderer is overridable via the
`renderers` prop. (css: the UA stylesheet now makes `img` `display: block`.)

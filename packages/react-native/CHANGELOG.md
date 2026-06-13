# @yk-yong/rn-rich-text

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
  - @yk-yong/rn-rich-text-css@0.1.0
  - @yk-yong/rn-rich-text-dom@0.1.0
  - @yk-yong/rn-rich-text-core@0.1.0

---
'@yk-yong/rn-rich-text': minor
---

Add the flagship `<RichText>` component: renders an HTML string to native React Native
`<View>`/`<Text>` by orchestrating parse → resolveStyles → buildRenderTree and walking the
render tree via a renderer registry, with per-weight/style font resolution (the `fonts` prop)
and `onLinkPress`. Custom renderers override any tag via the `renderers` prop.

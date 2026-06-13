# Dogfood: migrating the fonerewards seed → `@yk-yong/react-native-richtext`

Instructions to replace the in-app `@packages/rich-text` seed in
`fonerewards-user-app/mobile-app` with the published library. **Plan only — apply in the app repo.**

## Target

The seed is at `fonerewards-user-app/mobile-app/src/packages/rich-text` (exports `RichText`,
`parseHtml`, `decodeEntities`). It is consumed by exactly three screens, all with the same prop shape:

| Screen                                            | Props passed                                                  |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `src/app/screens/outlet/OutletAboutScreen.tsx`    | `html` `baseStyle` `emphasisStyles` `containerStyle`          |
| `src/app/screens/MerchantAboutScreen.tsx`         | `html` `baseStyle` `emphasisStyles` `containerStyle`          |
| `src/app/screens/voucher/VoucherDetailScreen.tsx` | `html` `baseStyle` `emphasisStyles` (×2, no `containerStyle`) |

App context: npm (`package-lock.json`), bare React Native **0.84.0**, **React 19.2.3** (satisfies the
library's `react >=18.2.0` / `react-native >=0.74.0` peer ranges), Metro bundler, path alias
`@packages/rich-text` → `src/packages/rich-text`.

## Strategy — adapter shim (zero screen changes)

Because all three screens import `{ RichText } from "@packages/rich-text"` with the same seed props,
the lowest-risk migration replaces the seed's `RichText.tsx` with a **thin adapter** that keeps the
seed's prop API and delegates to the library. The screens are untouched; you validate, then later
migrate screens to the native API and delete the seed.

### Step 1 — install the library

The packages publish to **GitHub Packages** (`@yk-yong` scope → `https://npm.pkg.github.com`), so the
app must route that scope to GitHub Packages and authenticate (GitHub Packages requires a token even
for reads). Add an `.npmrc` at the app root:

```ini
# fonerewards-user-app/mobile-app/.npmrc
@yk-yong:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Set `GITHUB_TOKEN` in the environment to a GitHub PAT with the `read:packages` scope (use an env var
or CI secret — don't commit the token). Then, after 0.1.0 is published:

```bash
cd fonerewards-user-app/mobile-app
npm install @yk-yong/react-native-richtext
# pulls @yk-yong/react-native-richtext-{dom,css,core} transitively
```

It is a normal npm dependency (not a workspace), so Metro resolves it from `node_modules` with **no
metro.config change**. (Pre-publish testing instead, no registry needed: `pnpm build && pnpm pack`
each of the 4 packages in the library repo, then `npm install <4 tarball paths>` here.)

### Step 2 — replace `src/packages/rich-text/RichText.tsx` with the adapter

Map the seed props to the library's `<RichText>`. The seed's `emphasisStyles` become `tagStyles`;
`containerStyle` becomes `style`; `html` becomes `source={{ html }}`.

```tsx
import { StyleSheet } from 'react-native'
import { RichText as LibRichText } from '@yk-yong/react-native-richtext'
import type { RichTextProps } from './RichText.types'

const flat = (s: unknown): Record<string, unknown> | undefined =>
  s == null ? undefined : (StyleSheet.flatten(s as never) as Record<string, unknown>)

export function RichText({
  html,
  baseStyle,
  emphasisStyles,
  containerStyle,
  onLinkPress,
}: RichTextProps) {
  const e = emphasisStyles ?? {}
  const bold = flat(e.bold)
  const italic = flat(e.italic)
  const tagStyles = {
    ...(bold && { b: bold, strong: bold }),
    ...(italic && { i: italic, em: italic }),
    ...(flat(e.underline) && { u: flat(e.underline)! }),
    ...(flat(e.strikethrough) && { s: flat(e.strikethrough)! }),
    ...(flat(e.link) && { a: flat(e.link)! }),
  }
  return (
    <LibRichText
      source={{ html: html ?? '' }}
      baseStyle={flat(baseStyle)}
      tagStyles={tagStyles}
      style={containerStyle}
      onLinkPress={onLinkPress}
    />
  )
}
```

Keep `RichText.types.ts` (the prop types) and `index.ts` (re-exporting `RichText`). The seed's
`parseHtml`/`decodeEntities`/`html-parse-stringify.d.ts` become unused — leave them until Step 4.

### Step 3 — prop mapping reference

| Seed prop                                                   | Library equivalent                    | Notes                                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `html`                                                      | `source={{ html }}`                   | `null`/`undefined` → render `""` (renders nothing)                                                                                   |
| `baseStyle` (`StyleProp<TextStyle>`)                        | `baseStyle` (`RNStyle`)               | flatten arrays via `StyleSheet.flatten`; text props apply to all text                                                                |
| `emphasisStyles.{bold,italic,underline,strikethrough,link}` | `tagStyles.{b/strong, i/em, u, s, a}` | flatten each                                                                                                                         |
| `emphasisStyles.boldItalic`                                 | — (cascade)                           | bold+italic resolve automatically via the cascade; for a dedicated bold-italic **font file**, use the library's `fonts` prop instead |
| `containerStyle` (`ViewStyle`)                              | `style`                               | outer container `<View>`                                                                                                             |
| `paragraphSpacing` (default 8)                              | `tagStyles.p` margins                 | not passed by the screens; the library applies UA `p { margin: 1em 0 }`. To match exactly, set `tagStyles={{ p: { marginTop: 8 } }}` |
| `listItemSpacing` (default 4)                               | `tagStyles.li` margins                | as above for `li`                                                                                                                    |
| `onLinkPress`                                               | `onLinkPress`                         | same signature; both default to `Linking.openURL`                                                                                    |

### Step 4 — validate, then clean up

- Run the screen tests: `npm test -- MerchantAboutScreen` and the `__tests__/screens/outlet` suite (they
  render `<RichText>` and assert structure). Adjust any assertions that depended on the seed's exact
  output (e.g. wrapper/marker structure) — the library renders `<View>`/`<Text>` via its registry.
- Run the app and eyeball the **About Us** screens (merchant/outlet description) and the voucher
  redemption/terms — confirm bold/italic/links/lists render and links open.
- Once green, delete the seed internals (`parseHtml.ts`, `decodeEntities.ts`, `html-parse-stringify.d.ts`,
  `RichText.tsx` is now the adapter). Optionally migrate the three screens to the native API
  (`source={{html}}`, `tagStyles`, `style`) and drop the adapter + `RichText.types.ts` entirely.

## Notes / risks

- **React 19**: the app is on React 19.2.3; the library's peer is `react >=18.2.0`, and it uses only
  stable hooks (`useMemo`/`useState`/`useEffect`/`useContext`) — compatible. (The library is
  _dev-tested_ against React 18.3.1; if you hit a 19-specific issue, file it.)
- **Custom fonts (the Montserrat insight)**: the seed leaned on `fontWeight`/`fontStyle`. If the app
  uses a custom family where RN doesn't synthesise bold/italic, pass the library's `fonts` prop
  (`{ Family: { '700': { normal, italic }, '400': { … } } }`) so emphasis selects the actual font
  _file_. Otherwise emphasis uses `fontWeight`/`fontStyle` (system synthesis), same as the seed.
- **Spacing**: the library ships a browser-like UA stylesheet (`p`/`h*`/`ul`/`blockquote` margins). If
  the screens looked tuned to the seed's `paragraphSpacing: 8` / `listItemSpacing: 4`, set the
  equivalent `tagStyles` or accept the (closer-to-browser) defaults.
- **Coverage**: the library is the v1 tag set + Phase 3 (`img`, list/quote/code polish). Tables are
  Phase 4. If the CMS HTML in descriptions uses `<table>`, those won't render until Phase 4.

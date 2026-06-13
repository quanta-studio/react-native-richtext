# react-native-richtext — Phase 3 (sub-project 3a): `img` → `<Image>` Design

Date: 2026-06-13
Status: Draft for review
Depends on: Phases 0–2 (dom, css, core, react-native) — all merged. Read the architecture doc
and the Phase 2b spec (`docs/specs/2026-06-13-phase-2b-react-native-design.md`) first.

## What this is

Phase 3 is "Images & list/quote polish", decomposed into two sub-projects:

- **3a — `img` → `<Image>`** (this spec): render `<img>` as a native React Native `<Image>`. It is
  the headline feature and is genuinely **broken** today — `img` has no UA rule, so it falls back to
  the CSS initial `display: inline` and renders as an empty `<Text>`.
- **3b — list/quote/code polish** (next cycle): nested list counters (`lower-alpha`/`lower-roman`,
  `start`/`type`), `blockquote` border, `pre`/`code` horizontal scroll, `hr` polish.

## Decisions locked during brainstorming (do not re-litigate)

| Question           | Decision                                                                                                                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 3 sequencing | **`img` first**, then list/quote/code polish (3b).                                                                                                                                                                                                                                    |
| Image sizing       | **Explicit dims + async intrinsic fallback.** Use `width`/`height` from the computed style or `attribs` when present; otherwise fetch the intrinsic size via `Image.getSize` and render at that, capped to the container width with aspect ratio preserved. The renderer is stateful. |
| Image placement    | **Block-level.** A UA rule sets `img { display: block }`, so each image becomes its own block (an `<Image>` in a block context), even one written mid-paragraph. Inline images are deferred.                                                                                          |
| Sizing structure   | **Approach A** — a pure `imageStyle` helper (the ratio/cap math, exhaustively tested) + a thin stateful `Img` component (the async glue).                                                                                                                                             |

## Scope across packages

### css — one UA rule

Add to the user-agent stylesheet (`packages/css/src/ua/ua-stylesheet.ts`):

```css
img {
  display: block;
}
```

That is the entire css change. `width`/`height`/`aspectRatio` are already whitelisted; `src`/`alt`/
`width`/`height` are HTML attributes carried on the DOM node (preserved by core as `attribs`), not
CSS, so the whitelist needs no change. This is a deliberate v1 deviation from HTML's inline default,
per the block-placement decision.

### core — no change

With `display: block`, an `<img>` flows through core's existing block/inline split as a childless
`BlockNode` (`tag: 'img'`, `attribs: { src, alt, width?, height? }`, no children). `<p>text<img>more</p>`
already splits into `[inline-container, img BlockNode, inline-container]` because the split flushes the
inline run on any block-level child. No core code changes; verified by the react-native integration
test, not by new core logic.

### react-native — the implementation

- A pure `imageStyle` helper (`src/renderers/image-style.ts`).
- A thin stateful `Img` renderer (`src/renderers/Img.tsx`), registered as `img` in `defaultRenderers`.
- An `Image` (with a mockable `getSize`) added to the test mock (`test/react-native-mock.tsx`).

## `imageStyle` helper (pure)

```ts
export interface IntrinsicSize {
  width: number
  height: number
}

export function imageStyle(opts: {
  explicitWidth?: number
  explicitHeight?: number
  intrinsic?: IntrinsicSize
  viewStyle: Record<string, unknown> // box props minus width/height
}): Record<string, unknown> | null
```

Logic:

1. `explicitWidth != null && explicitHeight != null` → `{ ...viewStyle, width: explicitWidth, height: explicitHeight }`.
2. else `intrinsic != null` → `{ ...viewStyle, width: explicitWidth ?? intrinsic.width, maxWidth: '100%', aspectRatio: intrinsic.width / intrinsic.height }` — ratio-preserving and capped to the container width.
3. else → `null` — intrinsic size still loading; render nothing.

(Edge: an `explicitHeight` without `explicitWidth` falls into branch 2 and is width-driven via the
intrinsic ratio. Acceptable for v1.)

## `Img` renderer (thin, stateful)

- Read `src`/`alt`/`width`/`height` from `attribs`; read `width`/`height` from the computed style via
  `splitStyle(node.style).view`. `viewStyle` = the box props minus `width`/`height` (sizing computes those).
- `explicitWidth` = numeric style `width`, else numeric `attribs.width`; same for `explicitHeight`.
- `useState<IntrinsicSize | undefined>` for the loaded intrinsic size.
- `useEffect`: when `src` is set and full explicit dims are NOT present, call
  `Image.getSize(src, (w, h) => setIntrinsic({ width: w, height: h }), () => {})`; guard against
  setting state after unmount.
- Render: if no `src` → `null`; compute `style = imageStyle({ explicitWidth, explicitHeight, intrinsic, viewStyle })`;
  if `style` is `null` (still loading) → `null`; else
  `<Image source={{ uri: src }} style={style} resizeMode="cover" accessibilityLabel={alt} accessible={alt != null} />`.
- Registered as `img: Img` in `defaultRenderers`, so a consumer can override `img` (e.g. swap in
  `expo-image`/`FastImage`) via the `renderers` prop.

## Test mock extension

Add `Image` to `test/react-native-mock.tsx`: a component that renders a host `'Image'` element and
exposes a static `getSize` as a `vi.fn` the tests drive to deliver intrinsic dimensions. Image tests
assert via the host `'Image'` element's props (`source`, `style`, `accessibilityLabel`) and the
`getSize` spy. (Other mock host components are string types; `Image` is a function component because
it must also carry the static `getSize` — tests query the host `'Image'` node, so there is no
double-match.)

## Testing strategy (TDD; no snapshots)

- **`imageStyle`** unit tests: explicit-both → fixed `width`/`height`; intrinsic-only → `width` +
  `maxWidth: '100%'` + `aspectRatio`; explicit-width + intrinsic → `width` + `aspectRatio`; nothing
  loaded → `null`; box props preserved.
- **`Img`** tests: explicit-dims image renders `<Image>` with `width`/`height` and does NOT call
  `getSize`; dimensionless image calls `Image.getSize`, then (after the async dims resolve, flushed
  via `act`) renders with `aspectRatio`; missing `src` → renders nothing; `alt` → `accessibilityLabel`.
- **Integration** (`<RichText>`): `<img src width height>` renders an `<Image>` with the right uri;
  `<p>text<img src>more</p>` renders the img as a sibling block, not inside the paragraph's `<Text>`.
- **css**: a `buildUaRules`/`resolveStyles` assertion that `img` computes `display: block`.

## Deliverable

`<img>` renders as a native `<Image>`: explicit dimensions honored, dimensionless images sized to
their intrinsic ratio (async) and capped to the container, `alt` surfaced for accessibility, and the
renderer overridable via the registry. Green CI. css UA rule + react-native renderer; no core change.

## Out of scope (this sub-project)

Inline images (image inside a text run); `object-fit` → `resizeMode` mapping; relative-URL base
resolution; loading/error placeholders; local/`require()` image sources; `srcset`/`<picture>`; and
the Phase 3b list/quote/code polish.

## Open questions (resolve during planning)

- Whether to put `resizeMode` as a prop vs. in `style` (RN deprecation trajectory) — prop is fine for
  the supported RN floor.
- Whether `data:` URIs need any special handling in `Image.getSize` (they generally work).
- Exact form of the `Image` mock so both `<Image>` rendering and `Image.getSize` spying are clean.

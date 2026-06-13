# rn-rich-text — Phase 3 (sub-project 3b): List / Quote / Code Polish Design

Date: 2026-06-13
Status: Draft for review
Depends on: Phases 0–3a (dom, css, core, react-native, img) — all merged.

## What this is

The second Phase 3 sub-project: polish for lists, blockquotes, and preformatted text. Four small,
mostly-additive items across core, css, and react-native:

1. **List counters** (core/markers) — `lower-alpha`/`upper-alpha`, `lower-roman`/`upper-roman`, and the
   `<ol start>`, `<ol type>`, `<li value>` attributes (today only `decimal` + `disc`/`circle`/`square`).
2. **blockquote border** (css UA) — a left bar + padding instead of the wide default margin.
3. **pre horizontal scroll** (react-native) — wrap `pre` content in a horizontal `<ScrollView>` so long
   monospace lines scroll instead of wrapping/clipping.
4. **hr / code** — no change (already adequate); inline-`code` background deferred.

## Decisions locked during brainstorming (do not re-litigate)

| Question                 | Decision                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| List-counter scope       | **Full common set + attributes**: `lower-/upper-alpha`, `lower-/upper-roman`, plus `<ol start>`, `<ol type>`, `<li value>`.                                                                      |
| Counter structure        | **Approach A** — pure converter functions (`toAlpha`, `toRoman`, `mapTypeAttr`, `parseInt10`) + a readable counter loop in `annotateMarkers`.                                                    |
| `type` vs computed style | The `type` attribute **wins** over the computed `list-style-type` when present (a v1 pragmatism so `<ol type="a">` works for plain consumers, whose computed style is the UA default `decimal`). |
| pre overflow             | **Horizontal scroll** (preserve formatting), not wrap.                                                                                                                                           |

## 1. List counters — `packages/core/src/markers.ts`

New pure functions (no signature change to the exported `annotateMarkers` or the `ListMarker` type):

- `toAlpha(n: number, upper: boolean): string` — bijective base-26: `1→a`, `26→z`, `27→aa`, `52→az`,
  `53→ba`, `703→aaa`. `upper` upper-cases. For `n < 1`, fall back to `String(n)`.
- `toRoman(n: number, upper: boolean): string` — standard subtractive roman (m/cm/d/cd/c/xc/l/xl/x/ix/v/iv/i).
  Outside `1..3999`, fall back to `String(n)` (decimal). `upper` upper-cases.
- `mapTypeAttr(type: string | undefined): string | undefined` — `a→lower-alpha`, `A→upper-alpha`,
  `i→lower-roman`, `I→upper-roman`, `1→decimal`, else `undefined`.
- `parseInt10(value: string | undefined): number | undefined` — `Number.parseInt(value, 10)` when finite,
  else `undefined`.

`markerText`:

```ts
function orderedMarker(index: number, listStyleType: string): string {
  switch (listStyleType) {
    case 'lower-alpha':
    case 'lower-latin':
      return `${toAlpha(index, false)}.`
    case 'upper-alpha':
    case 'upper-latin':
      return `${toAlpha(index, true)}.`
    case 'lower-roman':
      return `${toRoman(index, false)}.`
    case 'upper-roman':
      return `${toRoman(index, true)}.`
    default:
      return `${index}.` // decimal + any unknown ordered style
  }
}
// markerText(ordered, index, listStyleType): ordered -> orderedMarker; else BULLET[listStyleType] ?? '•'
```

`annotateMarkers` (per `ol`/`ul` block node):

```
ordered = node.tag === 'ol'
typeStyle = ordered ? mapTypeAttr(node.attribs.type) : undefined
next = ordered ? (parseInt10(node.attribs.start) ?? 1) : 1
for each direct child that is a block <li>:
  valueOverride = ordered ? parseInt10(child.attribs.value) : undefined
  index = valueOverride ?? next
  listStyleType = ordered
    ? (typeStyle ?? child.control.listStyleType ?? 'decimal')
    : (child.control.listStyleType ?? 'disc')
  child.marker = { ordered, index, listStyleType, text: markerText(ordered, index, listStyleType) }
  next = index + 1
then recurse into node.children (nested lists restart with their own counter)
```

## 2. blockquote border — `packages/css/src/ua/ua-stylesheet.ts`

Change the rule:

```
blockquote { display: block; margin: 1em 40px }
```

to:

```
blockquote { display: block; margin: 1em 0; border-left-width: 4px; border-left-color: #dddddd; padding-left: 16px }
```

`borderLeftWidth`/`borderLeftColor`/`paddingLeft` are already in the css whitelist and in `RNStyle`, and
the Block renderer routes them (box props) to the `<View>` — so no code change, just the rule.

## 3. pre horizontal scroll — `packages/react-native/src/renderers/Pre.tsx`

A new renderer, registered as `pre` in `defaultRenderers`:

```tsx
import { View, ScrollView } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@yk-yong/rn-rich-text-core'

export function Pre({ node, children }: RendererProps) {
  const { view } = splitStyle((node as BlockNode).style)
  return (
    <View style={view}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  )
}
```

The pre's box style (margin) lands on the outer `<View>`; its `white-space: pre` text (already preserved
by core) lays out at natural width inside the horizontal `<ScrollView>` and scrolls. The test mock gains a
`ScrollView` string host component.

## 4. hr / code — no change

`hr` already renders as a border-bottom `<View>`; `code` is already monospace (from the UA sheet). No work
this cycle.

## Testing strategy (TDD; no snapshots)

- **core**: `toAlpha` (`1`,`26`,`27`,`52`,`53`,`703`), `toRoman` (`1`,`4`,`9`,`40`,`90`,`3999`,`4000`→`"4000"`),
  `mapTypeAttr` (each letter + unknown), `parseInt10`; `annotateMarkers` — `lower-alpha`/`upper-alpha`/
  `lower-roman`/`upper-roman` markers, `<ol start="3">`, `<ol type="a">`, `<li value="5">` override, nested
  restart preserved, unordered bullets unchanged.
- **css**: a `buildUaRules` assertion that `blockquote` has `border-left-width` (value `4`).
- **react-native**: `Pre` renders a horizontal `<ScrollView>` wrapping its children, with the box style on
  the outer `<View>`; `defaultRenderers.pre === Pre`; a ScrollView-mock smoke test.
- **integration** (`<RichText>`): `<ol type="a" start="3"><li>x</li><li value="9">y</li></ol>` yields markers
  `c.` then `i.`; a `<pre>` renders its content inside a `ScrollView`; a `<blockquote>` renders a `<View>`
  with `borderLeftWidth: 4`.

## Deliverable

Ordered lists render `a./i./…` markers and honor `start`/`type`/`value`; blockquotes show a left bar; `pre`
scrolls horizontally for long lines. Green CI. core markers + a css UA rule + a react-native `Pre` renderer.

## Out of scope (this cycle)

Inline-`code` background; nested-`ul` bullet cycling by depth (`disc`→`circle`→`square`); `list-style-position`
(inside/outside); CSS `counter-reset`/`counter()`; marker alignment/column-width tuning; `<ol reversed>`.

## Open questions (resolve during planning)

- Whether `toRoman`/`toAlpha` should clamp or pass through for `0`/negative `value` attributes (plan: pass
  through via `String(n)` — these are malformed inputs).
- Exact blockquote border color/width (cosmetic; `#dddddd`/`4px` chosen).

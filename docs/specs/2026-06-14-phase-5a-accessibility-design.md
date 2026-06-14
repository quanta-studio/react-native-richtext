# react-native-richtext — Phase 5 (sub-project 5a): Accessibility — core semantic roles

Date: 2026-06-14
Status: Draft for review
Depends on: Phases 0–4b — all merged and shipped (0.3.0).

## What this is

The first Phase 5 sub-project. Today the rendered output carries almost no screen-reader semantics:
only `<img>` exposes a label. Links render as plain tappable text (not announced as links) and
headings render as ordinary blocks (no heading trait, so VoiceOver/TalkBack heading navigation
doesn't work). 5a adds the highest-impact, well-supported React Native accessibility roles to three
elements: **links**, **headings**, and **images**.

Scope is deliberately narrow: the three roles below are reliable on both iOS (VoiceOver) and Android
(TalkBack). List/table/structure roles have weaker, more inconsistent RN support and are deferred.

## Decisions locked during brainstorming (do not re-litigate)

| Question         | Decision                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Coverage         | **Core roles only**: `a` → `link`, `h1`–`h6` → `header` (+ level), `img` → `image`. Lists/tables/structure deferred.                      |
| Where it lives   | **Per-renderer** in the `react-native` package (each renderer owns its element's a11y). Not centralized; not in `core` (roles are RN-specific). |
| Heading renderer | A **dedicated `Heading` renderer** registered for `h1`–`h6`. The generic `Block` stays generic.                                          |
| Heading grouping | Heading View is **`accessible`** (announced as one unit with the header trait — required for heading navigation). Accepts that interactive content nested in a heading becomes non-focusable (rare). |
| Configurability  | **On by default, no new prop.** Consumers customize by overriding `a`/`h1…h6`/`img` via the existing `renderers` prop.                    |
| Decorative images | An `<img>` with no `alt` stays **hidden** from screen readers (current behavior preserved): `accessible`/role applied only when `alt` is present. |

## 1. Links — `packages/react-native/src/renderers/Anchor.tsx`

`Anchor` renders a `<Text>` with `onPress` when `href` is present. Add `accessibilityRole="link"` to
that `Text`, but only when `href` exists (a bare `<a>` with no `href` is not a link and keeps no role
/ no `onPress`). The `Text` is already focusable via `onPress`; the role makes VoiceOver/TalkBack
announce "link" and include it in the link rotor.

```tsx
const href = el.attribs.href
return (
  <Text
    style={resolveFont(text, fonts)}
    onPress={href ? () => onLinkPress(href) : undefined}
    accessibilityRole={href ? 'link' : undefined}
  >
    {children}
  </Text>
)
```

## 2. Headings — `packages/react-native/src/renderers/Heading.tsx` (new)

Today `h1`–`h6` fall through to the generic `Block` (`<View>` with box style, no heading semantics).
Add a `Heading` renderer:

```tsx
import { View } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@yk-yong/react-native-richtext-core'

function levelOf(tag: string): number {
  const n = Number.parseInt(tag.slice(1), 10) // 'h2' -> 2
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : 1
}

export function Heading({ node, children }: RendererProps) {
  const el = node as BlockNode
  const { view } = splitStyle(el.style)
  return (
    <View style={view} accessible accessibilityRole="header" aria-level={levelOf(el.tag)}>
      {children}
    </View>
  )
}
```

Registered for `h1`–`h6` in `defaultRenderers`. `accessibilityRole="header"` provides the heading
trait; `aria-level` (supported from RN 0.71+, ≥ our peer floor) conveys the level where the platform
honors it (best-effort — the role is the primary win). `accessible` groups the heading as one
announced element (required for the trait to surface).

## 3. Images — `packages/react-native/src/renderers/Img.tsx`

Add `accessibilityRole="image"` to the `<Image>`, next to the existing `accessibilityLabel={alt}` /
`accessible={alt !== undefined}`. Do not change the decorative-image behavior: with no `alt`, the
image remains `accessible={false}` and gets no role, so screen readers skip it.

```tsx
<Image
  source={{ uri: src }}
  style={style}
  resizeMode="cover"
  accessibilityRole="image"
  accessibilityLabel={alt}
  accessible={alt !== undefined}
/>
```

(`accessibilityRole` is harmless when `accessible` is false; the element is skipped regardless.)

## 4. Registry — `packages/react-native/src/renderers/defaults.ts`

Register the heading renderer for all six tags:

```ts
h1: Heading, h2: Heading, h3: Heading, h4: Heading, h5: Heading, h6: Heading,
```

(alongside the existing `a`, `li`, `hr`, `img`, `pre`, `table`, `tr`, `td`, `th`).

## 5. Testing strategy (TDD; no snapshots)

- **Anchor**: with `href` → the `Text` has `accessibilityRole: 'link'`; without `href` → no role
  (and no `onPress`).
- **Heading**: `levelOf('h3') === 3` (+ clamp/fallback for a bad tag); a `Heading` for `h2` renders a
  `View` with `accessibilityRole: 'header'`, `aria-level: 2`, `accessible: true`; box style applied.
- **Img**: with `alt` → `accessibilityRole: 'image'`, `accessibilityLabel`, `accessible: true`;
  without `alt` → `accessible: false`.
- **defaults**: `defaultRenderers.h1 … h6 === Heading`; existing registrations unchanged.
- **integration** (`<RichText>`): `<h2>Title</h2><p><a href="x">link</a></p>` exposes a `header`
  (level 2) and a `link` role in the rendered tree.

## Deliverable

Links announce as links, headings as headings (with level), images keep their alt label and an image
role; decorative images stay hidden. All on by default, customizable via `renderers`. Green CI.
A new `Heading` renderer + three small renderer edits + registry additions.

## Out of scope (this cycle → later)

- `ul`/`ol`/`li` (`list`/`listitem`) and `blockquote`/`code` grouping.
- Table accessibility (row/cell/header associations — no reliable RN primitive).
- `accessibilityHint`, live regions, focus management, custom announcement ordering.
- RTL/bidi, dynamic type/font scaling, reduced-motion.
- A consumer-facing a11y config prop (overriding via `renderers` covers it).

## Open questions (resolve during planning)

- Whether to also set `accessibilityRole="image"` only when `accessible` (currently applied
  unconditionally but inert when not accessible) — cosmetic; plan keeps it unconditional for
  simplicity.
- Confirm `aria-level` is the right cross-platform prop vs `accessibilityLevel` on the pinned RN
  line; if `aria-level` is not honored, fall back to documenting role-only headings (the role is the
  contract; level is best-effort).

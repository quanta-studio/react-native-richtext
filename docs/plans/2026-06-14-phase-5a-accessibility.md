# Phase 5a — Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add core screen-reader semantics to rendered rich text — links announce as links, headings as headings, images keep their alt label with an image role (decorative images stay hidden).

**Architecture:** Per-renderer accessibility props in the `react-native` package (each renderer owns its element's a11y). `Anchor` gains `accessibilityRole="link"`; a new `Heading` renderer registered for `h1`–`h6` gives the `header` role; `Img` gains `accessibilityRole="image"`. On by default; customizable via the existing `renderers` prop.

**Tech Stack:** TypeScript (strict, no `any`), pnpm workspaces, vitest (no snapshots), react-test-renderer with a string-host react-native mock.

**Spec:** `docs/specs/2026-06-14-phase-5a-accessibility-design.md`

**Branch:** `phase-5a-accessibility` (already created; the spec commit is its first commit).

## Resolved from the spec's open question
RN 0.86 (the pinned line) has **no typed `aria-level`/`accessibilityLevel`** prop (the supported `aria-*` set excludes level). Under strict TS / no-`any`, headings therefore set the **`header` role only** — heading *level* is dropped (the spec documented this as the fallback; the role is the contract). `header`, `link`, and `image` are all confirmed valid `AccessibilityRole` values in RN 0.86.

## How to run things (repo conventions)
- Tests run from the ROOT (packages have NO `test` script): `pnpm exec vitest run packages/react-native` or a single file `pnpm exec vitest run packages/react-native/test/<file>`. Do NOT use `pnpm --filter <pkg> test` (no-op).
- Typecheck: `pnpm --filter @yk-yong/react-native-richtext typecheck`. Whole-repo gates: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`.

---

## File Structure

**Create:**
- `packages/react-native/src/renderers/Heading.tsx` — `<View>` with `accessibilityRole="header"` + `accessible`, for `h1`–`h6`.
- `packages/react-native/test/heading.test.tsx` — Heading renderer + registration tests.
- `packages/react-native/test/accessibility-integration.test.tsx` — `<RichText>` end-to-end role exposure.

**Modify:**
- `packages/react-native/src/renderers/Anchor.tsx` — add `accessibilityRole="link"` when `href` present.
- `packages/react-native/src/renderers/Img.tsx` — add `accessibilityRole="image"`.
- `packages/react-native/src/renderers/defaults.ts` — register `h1`–`h6` → `Heading`.
- `packages/react-native/test/specializations.test.tsx` — Anchor link-role assertions.
- `packages/react-native/test/img-renderer.test.tsx` — Img image-role + decorative-hidden assertions.
- `.changeset/phase-5a-accessibility.md` — changelog entry.

**Dependency order:** Anchor (Task 1) → Heading + registration (Task 2) → Img (Task 3) → integration + verify + changeset (Task 4). Tasks are independent; this order is just convenient.

---

## Task 1: Anchor — `accessibilityRole="link"`

**Files:**
- Modify: `packages/react-native/src/renderers/Anchor.tsx`
- Test: `packages/react-native/test/specializations.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `packages/react-native/test/specializations.test.tsx`, add inside `describe('specializations', ...)` (the file already imports `Anchor`, `Text`, `InlineNode`, and defines `wrap`/`makeCtx`):

```tsx
  it('marks an anchor with href as a link for screen readers', () => {
    const node: InlineNode = {
      type: 'inline',
      tag: 'a',
      style: {},
      control: { display: 'inline', whiteSpace: 'normal' },
      attribs: { href: 'https://x.com' },
      children: [],
      key: '0',
    }
    const tree = wrap(<Anchor node={node}>link</Anchor>)
    expect(tree.root.findByType(Text).props.accessibilityRole).toBe('link')
  })

  it('sets no link role on an anchor without href', () => {
    const node: InlineNode = {
      type: 'inline',
      tag: 'a',
      style: {},
      control: { display: 'inline', whiteSpace: 'normal' },
      attribs: {},
      children: [],
      key: '0',
    }
    const tree = wrap(<Anchor node={node}>x</Anchor>)
    expect(tree.root.findByType(Text).props.accessibilityRole).toBeUndefined()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run packages/react-native/test/specializations.test.tsx`
Expected: FAIL — `accessibilityRole` is `undefined` for the href case.

- [ ] **Step 3: Add the role**

Replace `packages/react-native/src/renderers/Anchor.tsx` with:

```tsx
import { Text } from 'react-native'
import { splitStyle } from '../style/split-style'
import { resolveFont } from '../fonts/resolve-font'
import { useRichTextContext } from '../context'
import type { RendererProps } from '../types'
import type { InlineNode } from '@yk-yong/react-native-richtext-core'

export function Anchor({ node, children }: RendererProps) {
  const { fonts, onLinkPress } = useRichTextContext()
  const el = node as InlineNode
  const { text } = splitStyle(el.style)
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
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run packages/react-native/test/specializations.test.tsx` → PASS (incl. the existing Anchor onPress test).

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/src/renderers/Anchor.tsx packages/react-native/test/specializations.test.tsx
git commit -m "feat(react-native): announce anchors as links for screen readers"
```

---

## Task 2: Heading renderer for `h1`–`h6`

**Files:**
- Create: `packages/react-native/src/renderers/Heading.tsx`
- Modify: `packages/react-native/src/renderers/defaults.ts`
- Test: `packages/react-native/test/heading.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/react-native/test/heading.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View } from 'react-native'
import { Heading } from '../src/renderers/Heading'
import { defaultRenderers } from '../src/renderers/defaults'
import type { BlockNode } from '@yk-yong/react-native-richtext-core'

const headingNode = (tag: string, style: Record<string, unknown> = {}): BlockNode => ({
  type: 'block',
  tag,
  style,
  control: { display: 'block', whiteSpace: 'normal' },
  attribs: {},
  children: [],
  key: '0',
})

describe('Heading', () => {
  it('renders a View with the header role and is accessible', () => {
    const tree = create(<Heading node={headingNode('h2', { marginTop: 8 })} />)
    const view = tree.root.findByType(View)
    expect(view.props.accessibilityRole).toBe('header')
    expect(view.props.accessible).toBe(true)
    expect(view.props.style).toMatchObject({ marginTop: 8 })
  })

  it('is registered as the renderer for h1 through h6', () => {
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      expect(defaultRenderers[tag]).toBe(Heading)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run packages/react-native/test/heading.test.tsx`
Expected: FAIL — cannot resolve `../src/renderers/Heading`.

- [ ] **Step 3: Create the Heading renderer**

Create `packages/react-native/src/renderers/Heading.tsx`:

```tsx
import { View } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@yk-yong/react-native-richtext-core'

// h1–h6: a block View carrying the screen-reader "header" trait. `accessible` groups the
// heading as one announced element (required for the trait to surface and for heading
// navigation). RN 0.86 has no typed heading-level prop, so level is not emitted.
export function Heading({ node, children }: RendererProps) {
  const el = node as BlockNode
  const { view } = splitStyle(el.style)
  return (
    <View style={view} accessible accessibilityRole="header">
      {children}
    </View>
  )
}
```

- [ ] **Step 4: Register `h1`–`h6`**

Replace `packages/react-native/src/renderers/defaults.ts` with:

```ts
import { Anchor } from './Anchor'
import { ListItem } from './ListItem'
import { Rule } from './Rule'
import { Img } from './Img'
import { Pre } from './Pre'
import { Table } from './Table'
import { TableRow } from './TableRow'
import { TableCell } from './TableCell'
import { Heading } from './Heading'
import type { Renderer } from '../types'

/** Built-in tag specializations. Generic block/inline are NodeRenderer's fallback. */
export const defaultRenderers: Record<string, Renderer> = {
  a: Anchor,
  li: ListItem,
  hr: Rule,
  img: Img,
  pre: Pre,
  table: Table,
  tr: TableRow,
  td: TableCell,
  th: TableCell,
  h1: Heading,
  h2: Heading,
  h3: Heading,
  h4: Heading,
  h5: Heading,
  h6: Heading,
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm exec vitest run packages/react-native/test/heading.test.tsx` → PASS (2 tests).
Run: `pnpm exec vitest run packages/react-native` → full suite green.
Run: `pnpm --filter @yk-yong/react-native-richtext typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/react-native/src/renderers/Heading.tsx packages/react-native/src/renderers/defaults.ts packages/react-native/test/heading.test.tsx
git commit -m "feat(react-native): add Heading renderer with the header a11y role"
```

---

## Task 3: Img — `accessibilityRole="image"`

**Files:**
- Modify: `packages/react-native/src/renderers/Img.tsx`
- Test: `packages/react-native/test/img-renderer.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `packages/react-native/test/img-renderer.test.tsx`, add inside `describe('Img', ...)` (the file already imports `Image`, `act`, defines `imgNode` and `images`):

```tsx
  it('exposes the image role with the alt label', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(
        <Img node={imgNode({ src: 'https://x/e.png', width: '10', height: '10', alt: 'a dog' })} />,
      )
    })
    const img = images(tree)[0]!
    expect(img.props.accessibilityRole).toBe('image')
    expect(img.props.accessibilityLabel).toBe('a dog')
    expect(img.props.accessible).toBe(true)
  })

  it('hides a decorative (no-alt) image from screen readers', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<Img node={imgNode({ src: 'https://x/f.png', width: '10', height: '10' })} />)
    })
    expect(images(tree)[0]!.props.accessible).toBe(false)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run packages/react-native/test/img-renderer.test.tsx`
Expected: FAIL — `accessibilityRole` is `undefined` on the image.

- [ ] **Step 3: Add the role**

In `packages/react-native/src/renderers/Img.tsx`, update the returned `<Image>` to add `accessibilityRole="image"` (keep all other props exactly as they are):

```tsx
  return (
    <Image
      source={{ uri: src }}
      style={style}
      resizeMode="cover"
      accessibilityRole="image"
      accessibilityLabel={alt}
      accessible={alt !== undefined}
    />
  )
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run packages/react-native/test/img-renderer.test.tsx` → PASS (incl. existing tests).

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/src/renderers/Img.tsx packages/react-native/test/img-renderer.test.tsx
git commit -m "feat(react-native): add image a11y role to Img"
```

---

## Task 4: Integration test + verify + changeset

**Files:**
- Create: `packages/react-native/test/accessibility-integration.test.tsx`
- Create: `.changeset/phase-5a-accessibility.md`

- [ ] **Step 1: Write the integration test**

Create `packages/react-native/test/accessibility-integration.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { RichText } from '../src'

describe('integration: accessibility', () => {
  const html = '<h2>Title</h2><p><a href="https://x.com">link</a></p>'

  it('exposes header and link roles through RichText', () => {
    const tree = create(<RichText source={{ html }} />)
    const hasHeader = tree.root
      .findAllByType(View)
      .some((v) => v.props.accessibilityRole === 'header')
    const hasLink = tree.root.findAllByType(Text).some((t) => t.props.accessibilityRole === 'link')
    expect(hasHeader).toBe(true)
    expect(hasLink).toBe(true)
  })
})
```

- [ ] **Step 2: Run the integration test**

Run: `pnpm exec vitest run packages/react-native/test/accessibility-integration.test.tsx` → PASS (confirms `h2`→header and `a`→link flow through the public `<RichText>` pipeline).

- [ ] **Step 3: Run the full workspace gates**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

All must exit 0. If `format:check` fails, run `pnpm format` and re-check. If `lint` fails on new files, run `pnpm lint:fix` and review.

- [ ] **Step 4: Add a changeset**

Create `.changeset/phase-5a-accessibility.md`:

```md
---
'@yk-yong/react-native-richtext': minor
---

Phase 5a accessibility: links now announce as links (`accessibilityRole="link"`), headings (`h1`–`h6`) render with the `header` role via a new `Heading` renderer, and images expose the `image` role alongside their alt label (decorative no-alt images stay hidden from screen readers). All on by default and customizable via the `renderers` prop.
```

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/test/accessibility-integration.test.tsx .changeset/phase-5a-accessibility.md
git commit -m "test(react-native): a11y integration test; changeset for Phase 5a"
```

- [ ] **Step 6: Final confirmation**

Run: `pnpm test` → PASS across all packages. Branch `phase-5a-accessibility` is ready for a PR.

---

## Self-Review

**Spec coverage:**
- Links → `accessibilityRole="link"` (Task 1). ✅
- Headings → `header` role via dedicated `Heading` renderer for `h1`–`h6` (Task 2). Level dropped per the spec's documented fallback (untyped in RN 0.86). ✅
- Images → `accessibilityRole="image"` + existing alt label; decorative no-alt stays hidden (Task 3). ✅
- On by default, customizable via `renderers`; `Block` stays generic (a dedicated `Heading` is registered). ✅
- Testing: per-renderer (Tasks 1–3) + integration (Task 4). ✅

**Type consistency:** `Heading` is a `Renderer` (`({ node, children }: RendererProps)`), registered under `h1`–`h6`. `accessibilityRole` values used: `'link'`, `'header'`, `'image'` — all valid RN `AccessibilityRole`s. No `aria-level` (untyped).

**Placeholder scan:** none — every step has complete code and exact commands.

**Known intentional scope edges (per spec):** no list/table a11y, no heading level, no `accessibilityHint`/live regions/focus management. Decorative-image hiding relies on the existing `accessible={alt !== undefined}` logic, unchanged.

# Phase 3b: List / Quote / Code Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ordered lists render `a./i./…` markers and honor `<ol start>`/`<ol type>`/`<li value>`; blockquotes show a left bar; `pre` scrolls horizontally for long lines.

**Architecture:** Pure converter functions (`toAlpha`/`toRoman`/`mapTypeAttr`/`orderedMarker`) in a new `core/list-style.ts`; `core/markers.ts` resolves the ordered style (`type` attr wins over computed `list-style-type`), seeds from `start`, and applies `li value` overrides. css gets a `blockquote` left-border UA rule. react-native gets a `Pre` renderer (horizontal `ScrollView`) registered as `pre`.

**Tech Stack:** TypeScript 6 (strict, noUncheckedIndexedAccess), Vitest 4, react-test-renderer (rn). Mirror existing modules.

**Reference:** spec at `docs/specs/2026-06-13-phase-3b-list-quote-polish-design.md`.

**Lint note:** the repo eslint does NOT ignore `_`-prefixed unused vars. Run `pnpm lint` (whole repo) before committing each task.

---

## File Structure

```
packages/core/src/list-style.ts            # NEW: toAlpha, toRoman, mapTypeAttr, orderedMarker (pure)
packages/core/src/markers.ts               # MODIFY: parseInt10 + start/type/value in annotateMarkers
packages/css/src/ua/ua-stylesheet.ts       # MODIFY: blockquote left border
packages/react-native/src/renderers/Pre.tsx   # NEW
packages/react-native/src/renderers/defaults.ts # MODIFY: + pre: Pre
packages/react-native/test/react-native-mock.tsx # MODIFY: + ScrollView host
```

---

## Task 0: core list-style converters (`list-style.ts`)

**Files:** Create `packages/core/src/list-style.ts`; Test `packages/core/test/list-style.test.ts`.

- [ ] **Step 1: Write the failing test** — `packages/core/test/list-style.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { toAlpha, toRoman, mapTypeAttr, orderedMarker } from '../src/list-style'

describe('toAlpha', () => {
  it.each<[number, string]>([
    [1, 'a'],
    [2, 'b'],
    [26, 'z'],
    [27, 'aa'],
    [28, 'ab'],
    [52, 'az'],
    [53, 'ba'],
    [703, 'aaa'],
  ])('%i -> %s', (n, expected) => {
    expect(toAlpha(n, false)).toBe(expected)
  })
  it('upper-cases', () => {
    expect(toAlpha(27, true)).toBe('AA')
  })
})

describe('toRoman', () => {
  it.each<[number, string]>([
    [1, 'i'],
    [4, 'iv'],
    [9, 'ix'],
    [40, 'xl'],
    [90, 'xc'],
    [2024, 'mmxxiv'],
    [3999, 'mmmcmxcix'],
  ])('%i -> %s', (n, expected) => {
    expect(toRoman(n, false)).toBe(expected)
  })
  it('upper-cases', () => {
    expect(toRoman(4, true)).toBe('IV')
  })
  it('falls back to decimal outside 1..3999', () => {
    expect(toRoman(0, false)).toBe('0')
    expect(toRoman(4000, false)).toBe('4000')
  })
})

describe('mapTypeAttr', () => {
  it.each<[string | undefined, string | undefined]>([
    ['a', 'lower-alpha'],
    ['A', 'upper-alpha'],
    ['i', 'lower-roman'],
    ['I', 'upper-roman'],
    ['1', 'decimal'],
    ['x', undefined],
    [undefined, undefined],
  ])('%s -> %s', (type, expected) => {
    expect(mapTypeAttr(type)).toBe(expected)
  })
})

describe('orderedMarker', () => {
  it.each<[number, string, string]>([
    [1, 'decimal', '1.'],
    [3, 'lower-alpha', 'c.'],
    [3, 'upper-alpha', 'C.'],
    [4, 'lower-roman', 'iv.'],
    [4, 'upper-roman', 'IV.'],
    [2, 'unknown-style', '2.'],
  ])('%i %s -> %s', (index, type, expected) => {
    expect(orderedMarker(index, type)).toBe(expected)
  })
})
```

- [ ] **Step 2: Run → FAIL** (`pnpm exec vitest run packages/core/test/list-style.test.ts`).

- [ ] **Step 3: Implement `packages/core/src/list-style.ts`**

```ts
/** Bijective base-26: 1->a, 26->z, 27->aa. Falls back to String(n) for n < 1. */
export function toAlpha(n: number, upper: boolean): string {
  if (n < 1) return String(n)
  let s = ''
  let x = n
  while (x > 0) {
    const rem = (x - 1) % 26
    s = String.fromCharCode(97 + rem) + s
    x = Math.floor((x - 1) / 26)
  }
  return upper ? s.toUpperCase() : s
}

const ROMAN: ReadonlyArray<readonly [number, string]> = [
  [1000, 'm'],
  [900, 'cm'],
  [500, 'd'],
  [400, 'cd'],
  [100, 'c'],
  [90, 'xc'],
  [50, 'l'],
  [40, 'xl'],
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
]

/** Subtractive roman numerals for 1..3999; falls back to String(n) outside that range. */
export function toRoman(n: number, upper: boolean): string {
  if (n < 1 || n > 3999) return String(n)
  let x = n
  let s = ''
  for (const [value, symbol] of ROMAN) {
    while (x >= value) {
      s += symbol
      x -= value
    }
  }
  return upper ? s.toUpperCase() : s
}

/** Map an HTML <ol type> attribute to a CSS list-style-type. */
export function mapTypeAttr(type: string | undefined): string | undefined {
  switch (type) {
    case 'a':
      return 'lower-alpha'
    case 'A':
      return 'upper-alpha'
    case 'i':
      return 'lower-roman'
    case 'I':
      return 'upper-roman'
    case '1':
      return 'decimal'
    default:
      return undefined
  }
}

/** Render an ordered-list marker string for a 1-based index + list-style-type. */
export function orderedMarker(index: number, listStyleType: string): string {
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
      return `${index}.`
  }
}
```

- [ ] **Step 4: Run → PASS**; `pnpm --filter @yk-yong/react-native-richtext-core typecheck` + `pnpm lint` clean.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/list-style.ts packages/core/test/list-style.test.ts
git commit -m "feat(core): add list-style marker converters"
```

---

## Task 1: core markers — start/type/value (`markers.ts`)

**Files:** Modify `packages/core/src/markers.ts`; Test `packages/core/test/markers.test.ts`.

- [ ] **Step 1: Add failing tests** — append inside the existing `describe('annotateMarkers', ...)` in `packages/core/test/markers.test.ts` (it already has `run` and `lis` helpers — reuse them):

```ts
it('renders lower-alpha markers from a CSS list-style-type', () => {
  const items = lis(
    run('<ol style="list-style-type: lower-alpha"><li>a</li><li>b</li><li>c</li></ol>'),
  )
  expect(items.map((li) => li.marker?.text)).toEqual(['a.', 'b.', 'c.'])
})

it('honors the type attribute (lower-roman)', () => {
  const items = lis(run('<ol type="i"><li>a</li><li>b</li></ol>'))
  expect(items.map((li) => li.marker?.text)).toEqual(['i.', 'ii.'])
})

it('honors the start attribute', () => {
  const items = lis(run('<ol start="3"><li>a</li><li>b</li></ol>'))
  expect(items.map((li) => li.marker?.index)).toEqual([3, 4])
  expect(items.map((li) => li.marker?.text)).toEqual(['3.', '4.'])
})

it('honors a li value attribute and continues from it', () => {
  const items = lis(run('<ol><li>a</li><li value="9">b</li><li>c</li></ol>'))
  expect(items.map((li) => li.marker?.index)).toEqual([1, 9, 10])
})
```

- [ ] **Step 2: Run → FAIL** (`pnpm exec vitest run packages/core/test/markers.test.ts`) — current code ignores type/start/value and renders decimal.

- [ ] **Step 3: Rewrite `packages/core/src/markers.ts`**

```ts
import { mapTypeAttr, orderedMarker } from './list-style'
import type { BlockChild } from './types'

const BULLET: Record<string, string> = {
  disc: '•',
  circle: '◦',
  square: '▪',
  none: '',
}

function parseInt10(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : undefined
}

function markerText(ordered: boolean, index: number, listStyleType: string): string {
  if (ordered) return orderedMarker(index, listStyleType)
  return BULLET[listStyleType] ?? '•'
}

/** Annotate each <li> in the tree with its list marker. Mutates in place; returns the tree. */
export function annotateMarkers(nodes: BlockChild[]): BlockChild[] {
  for (const node of nodes) {
    if (node.type !== 'block') continue
    if (node.tag === 'ul' || node.tag === 'ol') {
      const ordered = node.tag === 'ol'
      const typeStyle = ordered ? mapTypeAttr(node.attribs.type) : undefined
      let next = ordered ? (parseInt10(node.attribs.start) ?? 1) : 1
      for (const child of node.children) {
        if (child.type === 'block' && child.tag === 'li') {
          const valueOverride = ordered ? parseInt10(child.attribs.value) : undefined
          const index = valueOverride ?? next
          const listStyleType = ordered
            ? (typeStyle ?? child.control.listStyleType ?? 'decimal')
            : (child.control.listStyleType ?? 'disc')
          child.marker = {
            ordered,
            index,
            listStyleType,
            text: markerText(ordered, index, listStyleType),
          }
          next = index + 1
        }
      }
    }
    annotateMarkers(node.children)
  }
  return nodes
}
```

- [ ] **Step 4: Run → PASS** (the new 4 tests + the existing 3 markers tests). Run `pnpm exec vitest run packages/core` (whole core suite green), `pnpm --filter @yk-yong/react-native-richtext-core typecheck` + `pnpm lint` clean. Note: `node.attribs`/`child.attribs` are accessible because `node.type === 'block'` and `child.tag === 'li'` narrow to `BlockNode`.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/markers.ts packages/core/test/markers.test.ts
git commit -m "feat(core): honor list-style-type, start, type, and value in markers"
```

---

## Task 2: css UA — blockquote left border

**Files:** Modify `packages/css/src/ua/ua-stylesheet.ts`; Test `packages/css/test/ua-rules.test.ts`.

- [ ] **Step 1: Add failing test** — append inside `describe('buildUaRules', ...)` in `packages/css/test/ua-rules.test.ts`:

```ts
it('gives blockquote a left border', () => {
  const bq = rules.filter((r) => r.match.kind === 'selector' && r.match.selector === 'blockquote')
  const decls = bq.flatMap((r) => r.declarations)
  expect(decls.find((d) => d.prop === 'borderLeftWidth')?.value).toBe(4)
})
```

- [ ] **Step 2: Run → FAIL** (current blockquote has no border).

- [ ] **Step 3: Change the blockquote rule** in `packages/css/src/ua/ua-stylesheet.ts` from:

```
blockquote { display: block; margin: 1em 40px }
```

to:

```
blockquote { display: block; margin: 1em 0; border-left-width: 4px; border-left-color: #dddddd; padding-left: 16px }
```

- [ ] **Step 4: Run → PASS**; `pnpm exec vitest run packages/css` (full css suite green) + `pnpm --filter @yk-yong/react-native-richtext-css typecheck` clean. (css-to-react-native maps `border-left-width: 4px` → `borderLeftWidth: 4`.)

- [ ] **Step 5: Commit**

```bash
git add packages/css/src/ua/ua-stylesheet.ts packages/css/test/ua-rules.test.ts
git commit -m "feat(css): give blockquote a left border in the ua stylesheet"
```

---

## Task 3: react-native — `Pre` renderer + ScrollView mock

**Files:** Modify `packages/react-native/test/react-native-mock.tsx`; Create `packages/react-native/src/renderers/Pre.tsx`; Modify `packages/react-native/src/renderers/defaults.ts`; Test `packages/react-native/test/pre.test.tsx`.

- [ ] **Step 1: Add `ScrollView` to the mock** — in `packages/react-native/test/react-native-mock.tsx`, add it alongside `View`/`Text`/`Pressable` (string host type):

```tsx
export const ScrollView = 'ScrollView' as unknown as ComponentType<HostProps>
```

- [ ] **Step 2: Write the failing test** — `packages/react-native/test/pre.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, ScrollView, Text } from 'react-native'
import { Pre } from '../src/renderers/Pre'
import { defaultRenderers } from '../src/renderers/defaults'
import type { BlockNode } from '@yk-yong/react-native-richtext-core'

const preNode = (style: Record<string, unknown> = {}): BlockNode => ({
  type: 'block',
  tag: 'pre',
  style,
  control: { display: 'block', whiteSpace: 'pre' },
  attribs: {},
  children: [],
  key: '0',
})

describe('Pre', () => {
  it('wraps content in a horizontal ScrollView inside a View with the box style', () => {
    const tree = create(
      <Pre node={preNode({ marginTop: 8 })}>
        <Text>code</Text>
      </Pre>,
    )
    expect(tree.root.findAllByType(View)[0]!.props.style).toMatchObject({ marginTop: 8 })
    const scroll = tree.root.findAllByType(ScrollView)[0]!
    expect(scroll.props.horizontal).toBe(true)
  })

  it('is registered as the pre default renderer', () => {
    expect(defaultRenderers.pre).toBe(Pre)
  })
})
```

- [ ] **Step 3: Run → FAIL**

- [ ] **Step 4: Implement `packages/react-native/src/renderers/Pre.tsx`**

```tsx
import { View, ScrollView } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@yk-yong/react-native-richtext-core'

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

- [ ] **Step 5: Register it** — in `packages/react-native/src/renderers/defaults.ts`, add the `Pre` import and the `pre: Pre` entry (keep `a`/`li`/`hr`/`img`):

```ts
import { Anchor } from './Anchor'
import { ListItem } from './ListItem'
import { Rule } from './Rule'
import { Img } from './Img'
import { Pre } from './Pre'
import type { Renderer } from '../types'

/** Built-in tag specializations. Generic block/inline are NodeRenderer's fallback. */
export const defaultRenderers: Record<string, Renderer> = {
  a: Anchor,
  li: ListItem,
  hr: Rule,
  img: Img,
  pre: Pre,
}
```

- [ ] **Step 6: Run → PASS** (2 tests); `pnpm exec vitest run packages/react-native` (whole rn suite green), `pnpm --filter @yk-yong/react-native-richtext typecheck` + `pnpm lint` clean.

- [ ] **Step 7: Commit**

```bash
git add packages/react-native/test/react-native-mock.tsx packages/react-native/src/renderers/Pre.tsx packages/react-native/src/renderers/defaults.ts packages/react-native/test/pre.test.tsx
git commit -m "feat(rn): render pre in a horizontal ScrollView"
```

---

## Task 4: End-to-end integration test

**Files:** Create `packages/react-native/test/polish-integration.test.tsx`.

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, ScrollView } from 'react-native'
import { RichText } from '../src'

describe('integration: list/quote/pre polish', () => {
  it('renders ol type + start + value markers', () => {
    const tree = create(
      <RichText source={{ html: '<ol type="a" start="3"><li>x</li><li value="9">y</li></ol>' }} />,
    )
    const json = JSON.stringify(tree.toJSON())
    expect(json).toContain('c. ') // index 3 with type=a -> 'c.'
    expect(json).toContain('i. ') // li value=9 with type=a -> 'i.' (9th letter)
  })

  it('renders pre inside a ScrollView', () => {
    const tree = create(<RichText source={{ html: '<pre>  line1\n  line2</pre>' }} />)
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(1)
  })

  it('gives blockquote a left border', () => {
    const tree = create(<RichText source={{ html: '<blockquote>quote</blockquote>' }} />)
    const hasBorder = tree.root.findAllByType(View).some((v) => {
      const s = v.props.style as Record<string, unknown> | undefined
      return s?.borderLeftWidth === 4
    })
    expect(hasBorder).toBe(true)
  })
})
```

- [ ] **Step 2: Run → PASS** (3 tests). If a marker text is wrong, investigate the core markers logic (do not weaken). Note: `type="a"` → lower-alpha; index 3 → `c`; `li value="9"` → 9 → `i` (the 9th letter). `ListItem` renders `<Text>{marker} </Text>`, so the JSON contains `"c. "` and `"i. "`.

- [ ] **Step 3: Run rn suite + typecheck + lint** → all green.

- [ ] **Step 4: Commit**

```bash
git add packages/react-native/test/polish-integration.test.tsx
git commit -m "test(rn): end-to-end list/quote/pre polish integration test"
```

---

## Task 5: Changeset + full green gate

**Files:** Create `.changeset/phase-3b-polish.md`.

- [ ] **Step 1: Add the changeset**

```md
---
'@yk-yong/react-native-richtext-core': minor
'@yk-yong/react-native-richtext-css': patch
'@yk-yong/react-native-richtext': minor
---

List/quote/code polish: ordered lists render `a.`/`i.`/`A.`/`I.` markers (lower/upper alpha + roman) and
honor the `<ol start>`, `<ol type>`, and `<li value>` attributes; `blockquote` gets a left border; `pre`
scrolls horizontally so long lines no longer wrap or clip.
```

- [ ] **Step 2: Run the full workspace gate**

Run: `pnpm install && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all exit 0. If `format:check` flags files, run `pnpm format` and re-run `pnpm test`.

- [ ] **Step 3: Commit**

```bash
git add .changeset packages
git commit -m "chore: add changeset for list/quote/code polish"
```

- [ ] **Step 4: Stop for branch finishing.** Do NOT push/PR here — the controller will use finishing-a-development-branch so the user chooses merge vs PR.

---

## Self-Review (completed during planning)

**1. Spec coverage** — every spec section maps to a task:

- List converters (`toAlpha`/`toRoman`/`mapTypeAttr`/`orderedMarker`, roman→decimal fallback) → Task 0.
- `annotateMarkers` start/type/value + ordered-style resolution (type wins) → Task 1.
- blockquote left border → Task 2.
- pre horizontal `ScrollView` + register + ScrollView mock → Task 3.
- hr/code no change → not implemented (correct).
- Testing (converter units, markers, css, Pre, integration) → Tasks 0–4.
- Out-of-scope (inline-code bg, ul depth-cycling, list-style-position, counter-reset, reversed) → not implemented.

**2. Placeholder scan** — no `TBD`/`TODO`/"handle edge cases"; every code step has real code + exact commands.

**3. Type consistency** — `toAlpha`/`toRoman`/`mapTypeAttr`/`orderedMarker` (Task 0) are imported and used identically in Task 1; `annotateMarkers` keeps its `(BlockChild[]) → BlockChild[]` signature and the `ListMarker` shape is unchanged; `Pre`/`defaultRenderers`/`ScrollView` are consistent across Tasks 3–4. The `node as BlockNode` cast in `Pre` matches the renderer convention.

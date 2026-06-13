# Phase 4b — Tables Measurement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 4a's equal/weighted table columns with content-proportional widths from a single `onLayout` max-content measurement pass, expanding to fill the container when the table fits and horizontally scrolling when it doesn't, honoring explicit `<col>`/cell widths.

**Architecture:** A pure `column-widths` helper (react-native, unit-tested like `image-style.ts`) computes per-column pixel widths + an `overflow` flag from measured max-content + explicit widths + container width. A stateful `Table` renders a natural-width **measure** pass (each cell wrapped in a thin `onLayout` View), then re-renders with fixed widths; `TableCell` is simplified to apply node style only. `core` gains a small `<colgroup>/<col>` parse → `colWidths` on `TableNode`. rowspan stays flat (4a); border polish deferred to 4c.

**Tech Stack:** TypeScript (strict, no `any`), pnpm workspaces, vitest (no snapshots), react-test-renderer with a string-host react-native mock (fire `onLayout` via `act()`), htmlparser2 substrate.

**Spec:** `docs/specs/2026-06-14-phase-4b-tables-measurement-design.md`

**Branch:** `phase-4b-tables-measurement` (already created; the spec commit is its first commit).

## How to run things (repo conventions)
- Tests run from the ROOT (packages have NO `test` script): `pnpm exec vitest run packages/<pkg>` or a single file `pnpm exec vitest run packages/<pkg>/test/<file>`. Do NOT use `pnpm --filter <pkg> test` (no-op).
- Per-package typecheck: `pnpm --filter @yk-yong/react-native-richtext-core typecheck` / `pnpm --filter @yk-yong/react-native-richtext typecheck`.
- Whole-repo gates: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`.

---

## File Structure

**Create:**
- `packages/react-native/src/renderers/column-widths.ts` — pure `computeColumnWidths(...)` + `CellMeasure`/I-O types.
- `packages/react-native/test/column-widths.test.ts` — unit tests for the helper.
- `packages/react-native/test/table-measure.test.tsx` — stateful `Table` measurement tests (onLayout via `act()`).

**Modify:**
- `packages/core/src/types.ts` — add `colWidths?: (number | undefined)[]` to `TableNode`.
- `packages/core/src/split.ts` — parse `<colgroup>/<col>` into `colWidths` in `buildTable`.
- `packages/core/test/table.test.ts` — assertions for `colWidths`.
- `packages/react-native/src/renderers/TableCell.tsx` — apply node style only (drop hardcoded `flexGrow`).
- `packages/react-native/src/renderers/Table.tsx` — rewrite: stateful measurement + computed widths + h-scroll.
- `packages/react-native/test/table.test.tsx` — update `TableCell`/`Table` tests to the 4b model.
- `packages/react-native/test/table-integration.test.tsx` — update the colspan assertion to the 4b model.
- `.changeset/phase-4b-tables-measurement.md` — changelog entry.

**Dependency order:** core `colWidths` (Task 1) → pure helper (Task 2) → component model switch + test updates (Task 3) → measurement integration tests (Task 4) → verify + changeset (Task 5).

---

## Task 1: core — parse `<col>` widths into `colWidths`

**Files:**
- Modify: `packages/core/src/types.ts` (the `TableNode` interface)
- Modify: `packages/core/src/split.ts` (`buildTable` + helpers)
- Test: `packages/core/test/table.test.ts`

- [ ] **Step 1: Write the failing tests**

In `packages/core/test/table.test.ts`, add inside `describe('buildTable', ...)`:

```ts
  it('parses <col width> into colWidths', () => {
    const t = firstTable(
      '<table><colgroup><col width="80"><col></colgroup><tr><td>a</td><td>b</td></tr></table>',
    )
    expect(t.colWidths).toEqual([80, undefined])
  })

  it('repeats a <col span> width across columns', () => {
    const t = firstTable(
      '<table><colgroup><col span="2" width="50"></colgroup><tr><td>a</td><td>b</td></tr></table>',
    )
    expect(t.colWidths).toEqual([50, 50])
  })

  it('ignores percentage col widths (deferred)', () => {
    const t = firstTable(
      '<table><colgroup><col width="50%"></colgroup><tr><td>a</td></tr></table>',
    )
    expect(t.colWidths).toEqual([undefined])
  })

  it('leaves colWidths undefined when there is no colgroup', () => {
    const t = firstTable('<table><tr><td>a</td></tr></table>')
    expect(t.colWidths).toBeUndefined()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run packages/core/test/table.test.ts`
Expected: FAIL — `t.colWidths` is `undefined` for the first three.

- [ ] **Step 3: Add `colWidths` to the TableNode type**

In `packages/core/src/types.ts`, add the field to `TableNode` (after `columnCount`):

```ts
export interface TableNode {
  type: 'table'
  tag: 'table'
  style: RNStyle
  control: ControlStyle
  attribs: Record<string, string>
  caption?: BlockChild[]
  columnCount: number
  colWidths?: (number | undefined)[]
  rows: TableRowNode[]
  key: string
}
```

- [ ] **Step 4: Parse colgroup/col in buildTable**

In `packages/core/src/split.ts`, add these two helpers (near `clampSpan`):

```ts
function parseColWidth(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const t = value.trim()
  if (t === '' || t.endsWith('%')) return undefined
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function collectColWidths(el: Element): (number | undefined)[] | undefined {
  const widths: (number | undefined)[] = []
  const handleCol = (col: Element): void => {
    const w = parseColWidth(col.attribs.width)
    const span = clampSpan(col.attribs.span)
    for (let i = 0; i < span; i++) widths.push(w)
  }
  for (const child of el.children as AnyNode[]) {
    if (!isTag(child)) continue
    if (child.name === 'colgroup') {
      for (const c of child.children as AnyNode[]) {
        if (isTag(c) && c.name === 'col') handleCol(c)
      }
    } else if (child.name === 'col') {
      handleCol(child)
    }
  }
  return widths.length > 0 ? widths : undefined
}
```

Then in `buildTable`, set the field on the returned node (add `colWidths: collectColWidths(el),` alongside `columnCount`):

```ts
  const { rows, columnCount } = normalizeGrid([...headRows, ...bodyRows, ...footRows])
  return {
    type: 'table',
    tag: 'table',
    style,
    control,
    attribs: el.attribs,
    caption,
    columnCount,
    colWidths: collectColWidths(el),
    rows,
    key,
  }
```

(`clampSpan`, `isTag`, `AnyNode`, `Element` are already imported/defined in `split.ts`.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run packages/core` → all green.
Run: `pnpm --filter @yk-yong/react-native-richtext-core typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/split.ts packages/core/test/table.test.ts
git commit -m "feat(core): parse <col> widths into TableNode.colWidths"
```

---

## Task 2: react-native — pure `computeColumnWidths` helper

**Files:**
- Create: `packages/react-native/src/renderers/column-widths.ts`
- Test: `packages/react-native/test/column-widths.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/react-native/test/column-widths.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeColumnWidths, type CellMeasure } from '../src/renderers/column-widths'

const m = (col: number, colSpan: number, width: number): CellMeasure => ({ col, colSpan, width })

describe('computeColumnWidths', () => {
  it('expands proportionally to fill when the table fits', () => {
    const r = computeColumnWidths({
      columnCount: 2,
      cells: [m(0, 1, 100), m(1, 1, 50)],
      explicit: [undefined, undefined],
      container: 300,
    })
    expect(r.overflow).toBe(false)
    expect(r.widths).toEqual([200, 100]) // slack 150 split 100:50
  })

  it('keeps natural widths and flags overflow when too wide', () => {
    const r = computeColumnWidths({
      columnCount: 2,
      cells: [m(0, 1, 200), m(1, 1, 200)],
      explicit: [undefined, undefined],
      container: 300,
    })
    expect(r).toEqual({ widths: [200, 200], overflow: true })
  })

  it('pins explicit columns and lets measured columns absorb slack', () => {
    const r = computeColumnWidths({
      columnCount: 2,
      cells: [m(1, 1, 100)],
      explicit: [80, undefined],
      container: 300,
    })
    expect(r.overflow).toBe(false)
    expect(r.widths).toEqual([80, 220]) // col0 pinned 80; col1 takes the rest
  })

  it('uses explicit widths as-is when all columns are explicit', () => {
    const r = computeColumnWidths({
      columnCount: 2,
      cells: [],
      explicit: [80, 120],
      container: 300,
    })
    expect(r).toEqual({ widths: [80, 120], overflow: false })
  })

  it('reconciles a colspan cell wider than its columns', () => {
    const r = computeColumnWidths({
      columnCount: 2,
      cells: [m(0, 1, 40), m(1, 1, 40), m(0, 2, 200)],
      explicit: [undefined, undefined],
      container: 1000,
    })
    // base max-content [40,40]=80; span cell 200 > 80 -> deficit 120 split -> [100,100]
    expect(r.widths).toEqual([500, 500]) // then expanded to fill 1000 proportionally (equal)
  })

  it('returns empty for zero columns', () => {
    expect(computeColumnWidths({ columnCount: 0, cells: [], explicit: [], container: 300 })).toEqual({
      widths: [],
      overflow: false,
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run packages/react-native/test/column-widths.test.ts`
Expected: FAIL — cannot resolve `../src/renderers/column-widths`.

- [ ] **Step 3: Implement the helper**

Create `packages/react-native/src/renderers/column-widths.ts`:

```ts
export interface CellMeasure {
  col: number // 0-based start column
  colSpan: number
  width: number // measured natural (max-content) width
}

export interface ColumnWidthInput {
  columnCount: number
  cells: CellMeasure[] // measured origin cells (fillers excluded)
  explicit: (number | undefined)[] // per column; explicit px from <col>/cell, else undefined
  container: number // available width (> 0)
}

export interface ColumnWidthResult {
  widths: number[]
  overflow: boolean
}

/**
 * Content-proportional column widths from measured max-content + explicit widths.
 * Fits (Σ target ≤ container): expand non-explicit columns proportionally to fill.
 * Overflow: keep target widths, flag overflow (caller horizontally scrolls).
 */
export function computeColumnWidths(input: ColumnWidthInput): ColumnWidthResult {
  const { columnCount, cells, explicit, container } = input
  if (columnCount === 0) return { widths: [], overflow: false }

  // 1. per-column max-content from colSpan === 1 cells.
  const maxContent = new Array<number>(columnCount).fill(0)
  for (const c of cells) {
    if (c.colSpan === 1 && c.col >= 0 && c.col < columnCount && c.width > maxContent[c.col]!) {
      maxContent[c.col] = c.width
    }
  }
  // 2. colspan reconciliation: spanned columns must sum to at least the spanning cell.
  for (const c of cells) {
    if (c.colSpan <= 1) continue
    const end = Math.min(c.col + c.colSpan, columnCount)
    let sum = 0
    for (let i = c.col; i < end; i++) sum += maxContent[i]!
    if (c.width > sum) {
      const add = (c.width - sum) / (end - c.col)
      for (let i = c.col; i < end; i++) maxContent[i]! += add
    }
  }
  // 3. target width per column (explicit overrides measured).
  const target = maxContent.map((mc, i) => explicit[i] ?? mc)
  const total = target.reduce((a, b) => a + b, 0)

  // 4. distribute.
  if (total > container) {
    return { widths: target, overflow: true }
  }
  const slack = container - total
  const flexTotal = target.reduce((a, t, i) => (explicit[i] === undefined ? a + t : a), 0)
  const widths = target.map((t, i) => {
    if (explicit[i] !== undefined || flexTotal <= 0) return t
    return t + slack * (t / flexTotal)
  })
  return { widths, overflow: false }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run packages/react-native/test/column-widths.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/src/renderers/column-widths.ts packages/react-native/test/column-widths.test.ts
git commit -m "feat(react-native): add pure column-widths helper for measured tables"
```

---

## Task 3: react-native — stateful Table + TableCell refactor (model switch)

This is the core change. `Table` becomes stateful and the column layout switches from weighted `flexGrow` (4a) to measured fixed widths (4b). `TableCell` and the 4a renderer tests change in the same commit so the suite stays green.

**Files:**
- Modify: `packages/react-native/src/renderers/TableCell.tsx`
- Modify: `packages/react-native/src/renderers/Table.tsx`
- Modify: `packages/react-native/test/table.test.tsx` (replace 4a `flexGrow` assertions)
- Modify: `packages/react-native/test/table-integration.test.tsx` (update colspan assertion)

- [ ] **Step 1: Simplify `TableCell` to apply node style only**

Replace `packages/react-native/src/renderers/TableCell.tsx` with:

```tsx
import { View } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { TableCellNode } from '@yk-yong/react-native-richtext-core'

// 4b: the Table owns column width (set on the node's style); the cell just renders its box.
export function TableCell({ node, children }: RendererProps) {
  const cell = node as TableCellNode
  const { view } = splitStyle(cell.style)
  return <View style={view}>{children}</View>
}
```

- [ ] **Step 2: Rewrite `Table` to measure and apply widths**

Replace `packages/react-native/src/renderers/Table.tsx` with:

```tsx
import { useState } from 'react'
import { View, ScrollView } from 'react-native'
import { useRichTextContext } from '../context'
import { NodeRenderer } from '../NodeRenderer'
import { splitStyle } from '../style/split-style'
import { TableRow } from './TableRow'
import { TableCell } from './TableCell'
import { computeColumnWidths, type CellMeasure } from './column-widths'
import type { RendererProps } from '../types'
import type { TableCellNode, TableNode } from '@yk-yong/react-native-richtext-core'

const BORDER_COLOR = '#000000'

function parseBorder(value: string | undefined): number {
  if (value === undefined) return 0
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function toPx(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : undefined
  if (typeof value === 'string') {
    const t = value.trim()
    if (t === '' || t.endsWith('%')) return undefined
    const n = Number.parseFloat(t)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  return undefined
}

function withStyle(cell: TableCellNode, extra: Record<string, unknown>): TableCellNode {
  return { ...cell, style: { ...cell.style, ...extra } }
}

// Per-column explicit width: <col> widths first, then colSpan-1 cell width.
function deriveExplicit(table: TableNode): (number | undefined)[] {
  const explicit = new Array<number | undefined>(table.columnCount).fill(undefined)
  if (table.colWidths) {
    for (let c = 0; c < table.columnCount; c++) explicit[c] = table.colWidths[c]
  }
  for (const row of table.rows) {
    let col = 0
    for (const item of row.items) {
      if (item.type === 'table-cell') {
        if (item.colSpan === 1 && explicit[col] === undefined) {
          explicit[col] = toPx(item.style.width) ?? toPx(item.attribs.width)
        }
        col += item.colSpan
      } else {
        col += 1
      }
    }
  }
  return explicit
}

function countCells(table: TableNode): number {
  let n = 0
  for (const row of table.rows) for (const item of row.items) if (item.type === 'table-cell') n++
  return n
}

export function Table({ node }: RendererProps) {
  const table = node as TableNode
  const { registry } = useRichTextContext()
  const { view } = splitStyle(table.style)
  const borderW = parseBorder(table.attribs.border)
  const tableBorder =
    borderW > 0
      ? { borderRightWidth: borderW, borderBottomWidth: borderW, borderColor: BORDER_COLOR }
      : null
  const RowComp = registry['tr'] ?? TableRow

  const explicit = deriveExplicit(table)
  const allExplicit =
    table.columnCount > 0 && explicit.every((w): w is number => w !== undefined)
  const expected = countCells(table)

  const [container, setContainer] = useState<number | undefined>(undefined)
  const [measures, setMeasures] = useState<Map<string, CellMeasure>>(() => new Map())

  // Final widths: explicit-only path needs no measurement; otherwise wait for container + cells.
  let widths: number[] | undefined
  let overflow = false
  if (allExplicit) {
    widths = explicit as number[]
    overflow = container !== undefined && widths.reduce((a, b) => a + b, 0) > container
  } else if (container !== undefined && measures.size >= expected) {
    const r = computeColumnWidths({
      columnCount: table.columnCount,
      cells: [...measures.values()],
      explicit,
      container,
    })
    widths = r.widths
    overflow = r.overflow
  }

  const recordCell = (key: string, mse: CellMeasure): void => {
    setMeasures((prev) => {
      const existing = prev.get(key)
      if (existing && existing.width === mse.width) return prev
      const next = new Map(prev)
      next.set(key, mse)
      return next
    })
  }
  const onOuterLayout = (w: number): void => {
    if (w > 0 && w !== container) setContainer(w)
  }

  const renderCells = (items: TableNode['rows'][number]['items']) => {
    let col = 0
    return items.map((item) => {
      const at = col
      if (item.type === 'table-filler') {
        col += 1
        return <View key={item.key} style={{ width: widths ? (widths[at] ?? 0) : 0 }} />
      }
      const span = item.colSpan
      col += span
      const CellComp = registry[item.tag] ?? TableCell
      const bordered =
        borderW > 0
          ? withStyle(item, {
              borderTopWidth: borderW,
              borderLeftWidth: borderW,
              borderColor: item.style.borderColor ?? BORDER_COLOR,
            })
          : item
      const content = item.children.map((c) => <NodeRenderer key={c.key} node={c} />)

      if (widths) {
        let w = 0
        for (let i = at; i < at + span; i++) w += widths[i] ?? 0
        return (
          <CellComp key={item.key} node={withStyle(bordered, { width: w, flexShrink: 0 })}>
            {content}
          </CellComp>
        )
      }
      // measure pass: a thin wrapper reports the cell's natural width.
      return (
        <View
          key={item.key}
          style={{ flexShrink: 0 }}
          onLayout={(e) =>
            recordCell(item.key, { col: at, colSpan: span, width: e.nativeEvent.layout.width })
          }
        >
          <CellComp node={bordered}>{content}</CellComp>
        </View>
      )
    })
  }

  const rows = (
    <View style={tableBorder}>
      {table.rows.map((row) => (
        <RowComp key={row.key} node={row}>
          {renderCells(row.items)}
        </RowComp>
      ))}
    </View>
  )

  return (
    <View style={view} onLayout={(e) => onOuterLayout(e.nativeEvent.layout.width)}>
      {table.caption?.map((c) => (
        <NodeRenderer key={c.key} node={c} />
      ))}
      {overflow ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {rows}
        </ScrollView>
      ) : (
        rows
      )}
    </View>
  )
}
```

- [ ] **Step 3: Update the unit tests to the 4b model**

In `packages/react-native/test/table.test.tsx`, the 4a `TableCell` test and the `Table` filler/border tests assert the old `flexGrow` model. Replace the `TableCell` describe block with:

```tsx
describe('TableCell', () => {
  it('renders the cell box style on a View (width comes from the node)', () => {
    const node = { ...cellNode(1), style: { width: 80, paddingTop: 2 } }
    const tree = create(<TableCell node={node} />)
    expect(tree.root.findByType(View).props.style).toMatchObject({ width: 80, paddingTop: 2 })
  })
})
```

In the `Table` describe block, replace the **filler** test (which looked for `flexGrow: 1`) and **border** test with the versions below, and leave the caption / override / defaults tests as-is (they don't depend on widths). Add `act` to the imports: `import { create, act } from 'react-test-renderer'`. Helper to drive layout:

```tsx
const fireLayout = (n: { props: { onLayout?: (e: unknown) => void } }, width: number) => {
  act(() => n.props.onLayout?.({ nativeEvent: { layout: { width, height: 10, x: 0, y: 0 } } }))
}
const outerView = (tree: ReturnType<typeof create>) => tree.root.findAllByType(View)[0]!
const measureWrappers = (tree: ReturnType<typeof create>) =>
  tree.root.findAll(
    (n) =>
      typeof (n.props as { onLayout?: unknown }).onLayout === 'function' &&
      (n.props as { style?: { flexShrink?: number } }).style?.flexShrink === 0,
  )
const measure = (tree: ReturnType<typeof create>, container: number, cellWidths: number[]) => {
  fireLayout(outerView(tree), container)
  measureWrappers(tree).forEach((w, i) => fireLayout(w, cellWidths[i] ?? 0))
}

describe('Table (measured)', () => {
  it('expands columns proportionally to fill when the table fits', () => {
    const tree = wrapTable(<Table node={tableNode()} />) // 1 cell + 1 filler, columnCount 2
    measure(tree, 300, [100]) // only the real cell measures
    const cellViews = tree.root
      .findAllByType(View)
      .filter((v) => typeof (v.props.style as { width?: number })?.width === 'number')
    const widths = cellViews.map((v) => (v.props.style as { width: number }).width)
    expect(widths).toContain(300) // single measured column fills the container
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(0)
  })

  it('keeps natural widths inside a horizontal ScrollView when it overflows', () => {
    const node = twoColTable() // see factory below: 2 real cells, columnCount 2
    const tree = wrapTable(<Table node={node} />)
    measure(tree, 150, [200, 200]) // total 400 > 150 -> overflow
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(1)
    expect(tree.root.findAllByType(ScrollView)[0]!.props.horizontal).toBe(true)
  })

  it('applies the legacy border attribute as collapse-style cell borders', () => {
    const tree = wrapTable(<Table node={tableNode({ attribs: { border: '1' } })} />)
    measure(tree, 300, [100])
    const bordered = tree.root
      .findAllByType(View)
      .some((v) => (v.props.style as { borderTopWidth?: number })?.borderTopWidth === 1)
    expect(bordered).toBe(true)
  })

  it('skips measurement when every column has an explicit <col> width', () => {
    const node = twoColTable({ colWidths: [80, 120] })
    const tree = wrapTable(<Table node={node} />)
    // no onLayout fired yet: widths already known from colWidths -> no measure wrappers
    expect(measureWrappers(tree)).toHaveLength(0)
    const widths = tree.root
      .findAllByType(View)
      .map((v) => (v.props.style as { width?: number })?.width)
      .filter((w): w is number => typeof w === 'number')
    expect(widths).toEqual(expect.arrayContaining([80, 120]))
  })
})
```

Add a two-real-cell factory next to the existing `tableNode` factory:

```tsx
const twoColTable = (overrides: Partial<TableNode> = {}): TableNode => ({
  type: 'table',
  tag: 'table',
  style: {},
  control: { display: 'table', whiteSpace: 'normal' },
  attribs: {},
  columnCount: 2,
  key: 't2',
  rows: [
    {
      type: 'table-row',
      isHeader: false,
      style: {},
      attribs: {},
      key: 'r0',
      items: [
        { type: 'table-cell', tag: 'td', isHeader: false, colSpan: 1, rowSpan: 1, style: {}, control: { display: 'table-cell', whiteSpace: 'normal' }, attribs: {}, children: [], key: 'r0.0' },
        { type: 'table-cell', tag: 'td', isHeader: false, colSpan: 1, rowSpan: 1, style: {}, control: { display: 'table-cell', whiteSpace: 'normal' }, attribs: {}, children: [], key: 'r0.1' },
      ],
    },
  ],
  ...overrides,
})
```

Ensure `ScrollView` is imported in this test file: `import { View, ScrollView } from 'react-native'`. Keep the existing caption, `renderers={{ td }}` override, and `defaultRenderers` tests unchanged.

- [ ] **Step 4: Update the existing integration test to the 4b model**

In `packages/react-native/test/table-integration.test.tsx`, the test `gives the colspan=2 header cell flexGrow 2` is invalid under 4b (no `flexGrow`; widths come from measurement which doesn't auto-fire in react-test-renderer). Replace that single `it` with a structure assertion that doesn't depend on measured widths:

```tsx
  it('renders the colspan header cell across the table without crashing', () => {
    const tree = create(<RichText source={{ html }} />)
    // Pre-measurement: the table renders its content (measure pass) without throwing.
    expect(JSON.stringify(tree.toJSON())).toContain('Score')
  })
```

Leave the other two integration tests (header/body text; centered `th`) unchanged.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run packages/react-native` → all green.
Run: `pnpm --filter @yk-yong/react-native-richtext typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/react-native/src/renderers/TableCell.tsx packages/react-native/src/renderers/Table.tsx packages/react-native/test/table.test.tsx packages/react-native/test/table-integration.test.tsx
git commit -m "feat(react-native): measure table columns and apply content-proportional widths"
```

---

## Task 4: react-native — measurement integration tests via `<RichText>`

**Files:**
- Create: `packages/react-native/test/table-measure.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/react-native/test/table-measure.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { create, act } from 'react-test-renderer'
import { View, ScrollView } from 'react-native'
import { RichText } from '../src'

const fireLayout = (n: { props: { onLayout?: (e: unknown) => void } }, width: number) =>
  act(() => n.props.onLayout?.({ nativeEvent: { layout: { width, height: 10, x: 0, y: 0 } } }))

const measureWrappers = (tree: ReturnType<typeof create>) =>
  tree.root.findAll(
    (n) =>
      typeof (n.props as { onLayout?: unknown }).onLayout === 'function' &&
      (n.props as { style?: { flexShrink?: number } }).style?.flexShrink === 0,
  )

const drive = (tree: ReturnType<typeof create>, container: number, cellWidths: number[]) => {
  const outer = tree.root.findAllByType(View)[0]!
  fireLayout(outer, container)
  measureWrappers(tree).forEach((w, i) => fireLayout(w, cellWidths[i] ?? 0))
}

const widthsOf = (tree: ReturnType<typeof create>) =>
  tree.root
    .findAllByType(View)
    .map((v) => (v.props.style as { width?: number })?.width)
    .filter((w): w is number => typeof w === 'number')

describe('integration: table measurement', () => {
  const html =
    '<table><tr><td>Name</td><td>A much longer description cell</td></tr></table>'

  it('fills the container with content-proportional columns when it fits', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<RichText source={{ html }} />)
    })
    drive(tree, 300, [60, 240]) // total 300 == container -> exact fit, no expansion
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(0)
    expect(widthsOf(tree)).toEqual(expect.arrayContaining([60, 240]))
  })

  it('horizontally scrolls when columns exceed the container', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<RichText source={{ html }} />)
    })
    drive(tree, 100, [60, 240]) // total 300 > 100 -> overflow
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(1)
    expect(widthsOf(tree)).toEqual(expect.arrayContaining([60, 240]))
  })

  it('honors an explicit <col width> without measuring', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(
        <RichText
          source={{
            html: '<table><colgroup><col width="50"><col width="150"></colgroup><tr><td>a</td><td>b</td></tr></table>',
          }}
        />,
      )
    })
    fireLayout(tree.root.findAllByType(View)[0]!, 400) // only container needed
    expect(widthsOf(tree)).toEqual(expect.arrayContaining([50, 150]))
  })
})
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `pnpm exec vitest run packages/react-native/test/table-measure.test.tsx`
Expected: PASS (3 tests). This is an end-to-end confirmation that parse → resolve → buildTable → Table measurement → computed widths works through the public `<RichText>`. If a width assertion is off, check the exact-fit math (`drive` totals must equal/exceed the container to hit the intended branch).

- [ ] **Step 3: Commit**

```bash
git add packages/react-native/test/table-measure.test.tsx
git commit -m "test(react-native): integration tests for measured table widths and h-scroll"
```

---

## Task 5: Verify the whole repo + changeset

**Files:**
- Create: `.changeset/phase-4b-tables-measurement.md`

- [ ] **Step 1: Run the full workspace gates**

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
```

All must exit 0. If `format:check` fails, run `pnpm format` and re-check. If `lint` fails on new files, run `pnpm lint:fix` and review.

- [ ] **Step 2: Add a changeset**

Create `.changeset/phase-4b-tables-measurement.md`:

```md
---
'@yk-yong/react-native-richtext': minor
'@yk-yong/react-native-richtext-core': minor
---

Phase 4b: table columns are now content-proportional. A single onLayout measurement pass sizes each column to its max-content; the table expands to fill its container when it fits and scrolls horizontally when it doesn't. Explicit `<col width>` and cell `width` are honored (and skip measurement when every column is explicit). rowspan still renders flat; border-spacing/collapse polish remains deferred.
```

(core is `minor` for the `TableNode.colWidths` addition; react-native is `minor` for the new measured layout.)

- [ ] **Step 3: Commit**

```bash
git add .changeset/phase-4b-tables-measurement.md
git commit -m "chore: changeset for Phase 4b table measurement"
```

- [ ] **Step 4: Final confirmation**

Run: `pnpm test` → PASS across all packages. Branch `phase-4b-tables-measurement` is ready for a PR.

---

## Self-Review

**Spec coverage:**
- Measured max-content column widths → Task 2 (helper) + Task 3 (measure pass). ✅
- Proportional fill on fit / h-scroll on overflow → Task 2 (algorithm) + Task 3 (ScrollView). ✅
- Explicit `<col>` widths → Task 1 (core parse) + Task 3 (`deriveExplicit`). Cell `width` → Task 3 (`deriveExplicit`/`toPx`). ✅
- Single measurement pass / natural-width first paint → Task 3 (measure wrapper, then widths). ✅
- Skip-measurement when all explicit → Task 3 (`allExplicit` path) + Task 3/4 tests. ✅
- Only-on-overflow ScrollView (simpler tree, per user steer) → Task 3 (`overflow ? ScrollView : rows`). ✅
- Preserve 4a: caption, `th`, overrides, flat rowspan, borders → Task 3 (carried in the rewrite) + retained tests. ✅
- Testing strategy (helper, core, renderer, integration) → Tasks 2/1/3/4. ✅

**Type consistency:** `CellMeasure {col,colSpan,width}`, `computeColumnWidths`, `ColumnWidthResult {widths,overflow}`, `TableNode.colWidths`, `deriveExplicit`/`toPx`/`withStyle`/`countCells` are used identically across tasks. `widths` is pixel-width array; `overflow` boolean gates the ScrollView.

**Placeholder scan:** none — every step has complete code and exact commands.

**Known intentional edges (per spec out-of-scope):** rowspan flat (fillers get a column width, no vertical span); no min-content/full CSS distribution; `%` widths and spanning-cell explicit widths ignored; brief pre-measurement natural-width paint for wide tables (single reflow, only-on-overflow ScrollView); container re-measure is best-effort via `onLayout`.

# Phase 4a — Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render `<table>` (with `thead/tbody/tfoot/tr/td/th/caption`, `colspan`/`rowspan`, nested tables) as aligned weighted-flex columns — colspan as flex weight, rowspan modeled in core and rendered flat with filler cells.

**Architecture:** A dedicated normalized grid in the React-free `core` package (`TableNode` whose rows are pre-resolved into origin-cells + filler-slots via a pure occupancy algorithm), `display: table` support + UA stylesheet in `css`, and deterministic `Table`/`TableRow`/`TableCell` renderers in `react-native`. Measurement-based content-proportional column widths and horizontal scroll are deferred to Phase 4b, which reuses this grid untouched.

**Tech Stack:** TypeScript (strict, no `any`), pnpm workspaces, vitest (no snapshots), react-test-renderer with a string-host react-native mock, htmlparser2/css-tree/css-to-react-native substrate.

**Spec:** `docs/specs/2026-06-13-phase-4a-tables-design.md`

**Branch:** `phase-4a-tables` (already created; the spec commit is its first commit).

---

## File Structure

**Create:**

- `packages/core/src/table-grid.ts` — pure occupancy normalizer: `normalizeGrid(RawRow[]) → { rows, columnCount }`. No DOM/style deps; exhaustively unit-tested.
- `packages/core/test/table-grid.test.ts` — unit tests for `normalizeGrid`.
- `packages/core/test/table.test.ts` — end-to-end `buildTable` tests (parse → resolve → split → text → markers).
- `packages/react-native/src/renderers/TableCell.tsx` — weighted cell `<View>` (flexGrow = colSpan).
- `packages/react-native/src/renderers/TableRow.tsx` — row `<View>` (flexDirection row, alignItems stretch).
- `packages/react-native/src/renderers/Table.tsx` — orchestrates caption + rows + cells; registry override lookups; legacy `border` attr.
- `packages/react-native/test/table.test.tsx` — renderer unit tests.
- `packages/react-native/test/table-integration.test.tsx` — `<RichText>` end-to-end table.
- `.changeset/phase-4a-tables.md` — user-facing changelog entry.

**Modify:**

- `packages/css/src/types.ts` — extend `ControlStyle.display` union; add `borderCollapse`.
- `packages/css/src/mapping/whitelist.ts` — add `borderCollapse` to `CONTROL_PROPS`.
- `packages/css/src/resolve/compute-element.ts` — add `borderCollapse` to its `CONTROL_PROPS`.
- `packages/css/src/ua/ua-stylesheet.ts` — add table UA rules.
- `packages/css/test/whitelist.test.ts`, `packages/css/test/map-declaration.test.ts`, `packages/css/test/ua-rules.test.ts` — assertions for the above.
- `packages/core/src/types.ts` — add `TableNode`/`TableRowNode`/`TableCellNode`/`FillerSlot`/`RowItem`; extend `BlockChild` + `RenderNode`.
- `packages/core/src/classify.ts` — `isBlockLevel` recognizes `'table'`.
- `packages/core/src/split.ts` — dispatch `display: table` → `buildTable`; add `buildTable`/`collectSectionRows`/`buildRow`/`buildCell`/`clampSpan`.
- `packages/core/src/text/process-text.ts` — recurse into table caption/cells.
- `packages/core/src/markers.ts` — recurse into table caption/cells.
- `packages/core/src/index.ts` — export the new table types.
- `packages/core/test/classify.test.ts` — `isBlockLevel('table')` assertion.
- `packages/react-native/src/NodeRenderer.tsx` — add `case 'table'`.
- `packages/react-native/src/renderers/defaults.ts` — register `table`/`tr`/`td`/`th`.

**Dependency order:** css (Tasks 1–2) → core grid (Tasks 3–4) → core split/passes (Tasks 5–6) → react-native (Tasks 7–8) → integration (Task 9) → verify + changeset (Task 10). `core`'s table tests need the UA `display: table` rule, so css must land first.

---

## Task 1: CSS — `display: table*` values + `border-collapse` control prop

**Files:**

- Modify: `packages/css/src/types.ts:69` (the `display` union) and `:68-73` (`ControlStyle`)
- Modify: `packages/css/src/mapping/whitelist.ts:66-72` (`CONTROL_PROPS`)
- Modify: `packages/css/src/resolve/compute-element.ts:20-25` (`CONTROL_PROPS`)
- Test: `packages/css/test/whitelist.test.ts`, `packages/css/test/map-declaration.test.ts`

- [ ] **Step 1: Write the failing tests**

In `packages/css/test/whitelist.test.ts`, add inside `describe('classifyProp', ...)`:

```ts
it('classifies border-collapse as control', () => {
  expect(classifyProp('borderCollapse')).toBe('control')
})
```

In `packages/css/test/map-declaration.test.ts`, add (match the existing `RawDecl` shape used in that file — `{ property, value, important }`):

```ts
it('maps border-collapse to a control decl', () => {
  const { decls } = mapDeclaration({
    property: 'border-collapse',
    value: 'collapse',
    important: false,
  })
  expect(decls).toEqual([{ prop: 'borderCollapse', value: 'collapse', important: false }])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @yk-yong/react-native-richtext-css test`
Expected: FAIL — `classifyProp('borderCollapse')` returns `'unsupported'`; the map test returns `decls: []`.

- [ ] **Step 3: Extend the `display` union and add `borderCollapse`**

In `packages/css/src/types.ts`, replace the `ControlStyle` interface (lines 68–73):

```ts
/** CSS-computed props the renderer needs that are not RN style keys. */
export interface ControlStyle {
  display:
    | 'block'
    | 'inline'
    | 'inline-block'
    | 'list-item'
    | 'none'
    | 'table'
    | 'table-row'
    | 'table-row-group'
    | 'table-header-group'
    | 'table-footer-group'
    | 'table-cell'
    | 'table-caption'
    | 'table-column'
    | 'table-column-group'
  whiteSpace: 'normal' | 'pre' | 'pre-wrap' | 'pre-line' | 'nowrap'
  listStyleType?: string
  listStylePosition?: 'inside' | 'outside'
  borderCollapse?: 'collapse' | 'separate'
}
```

- [ ] **Step 4: Whitelist `borderCollapse` as a control prop**

In `packages/css/src/mapping/whitelist.ts`, add `'borderCollapse'` to the `CONTROL_PROPS` set (after `'listStyle'`):

```ts
const CONTROL_PROPS = new Set<string>([
  'display',
  'whiteSpace',
  'listStyleType',
  'listStylePosition',
  'listStyle',
  'borderCollapse',
])
```

In `packages/css/src/resolve/compute-element.ts`, add `'borderCollapse'` to that file's separate `CONTROL_PROPS` set (lines 20–25):

```ts
const CONTROL_PROPS = new Set<string>([
  'display',
  'whiteSpace',
  'listStyleType',
  'listStylePosition',
  'borderCollapse',
])
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @yk-yong/react-native-richtext-css test`
Expected: PASS (all css tests green).

- [ ] **Step 6: Commit**

```bash
git add packages/css/src/types.ts packages/css/src/mapping/whitelist.ts packages/css/src/resolve/compute-element.ts packages/css/test/whitelist.test.ts packages/css/test/map-declaration.test.ts
git commit -m "feat(css): recognize table display values and border-collapse"
```

---

## Task 2: CSS — table UA stylesheet rules

**Files:**

- Modify: `packages/css/src/ua/ua-stylesheet.ts`
- Test: `packages/css/test/ua-rules.test.ts`

- [ ] **Step 1: Write the failing tests**

In `packages/css/test/ua-rules.test.ts`, add inside `describe('buildUaRules', ...)`:

```ts
it('makes table display table', () => {
  const table = rules.filter((r) => r.match.kind === 'selector' && r.match.selector === 'table')
  const display = table.flatMap((r) => r.declarations).find((d) => d.prop === 'display')
  expect(display?.value).toBe('table')
})

it('makes th bold and centered', () => {
  const th = rules.filter((r) => r.match.kind === 'selector' && r.match.selector === 'th')
  const decls = th.flatMap((r) => r.declarations)
  expect(decls.find((d) => d.prop === 'fontWeight')?.value).toBe('bold')
  expect(decls.find((d) => d.prop === 'textAlign')?.value).toBe('center')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @yk-yong/react-native-richtext-css test ua-rules`
Expected: FAIL — no `table`/`th` selectors in the UA rules.

- [ ] **Step 3: Add the table UA rules**

In `packages/css/src/ua/ua-stylesheet.ts`, append these lines to the `UA_STYLESHEET` template string, after the `hr` line (line 30) and before the inline element rules:

```
table { display: table; border-collapse: collapse }
thead { display: table-header-group }
tbody { display: table-row-group }
tfoot { display: table-footer-group }
tr { display: table-row }
td { display: table-cell; padding: 2px }
th { display: table-cell; padding: 2px; font-weight: bold; text-align: center }
caption { display: table-caption; text-align: center }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @yk-yong/react-native-richtext-css test`
Expected: PASS (all css tests green — confirms `border-collapse: collapse` in the UA sheet produces no diagnostic, since it now maps to a control decl).

- [ ] **Step 5: Commit**

```bash
git add packages/css/src/ua/ua-stylesheet.ts packages/css/test/ua-rules.test.ts
git commit -m "feat(css): add table UA stylesheet rules"
```

---

## Task 3: Core — table render-tree node types

**Files:**

- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/index.ts`

This task adds only types (no runtime behavior); it is verified by typecheck and consumed by Task 4. No standalone test — the next task's failing test exercises these types.

- [ ] **Step 1: Add the table node interfaces and extend the unions**

In `packages/core/src/types.ts`, add the following interfaces after `BlockNode` (after line 22), and replace the `BlockChild` / `RenderNode` type aliases at the bottom (lines 54–55):

```ts
export interface TableNode {
  type: 'table'
  tag: 'table'
  style: RNStyle
  control: ControlStyle
  attribs: Record<string, string>
  caption?: BlockChild[]
  columnCount: number
  rows: TableRowNode[]
  key: string
}

export interface TableRowNode {
  type: 'table-row'
  isHeader: boolean
  style: RNStyle
  attribs: Record<string, string>
  items: RowItem[]
  key: string
}

export interface TableCellNode {
  type: 'table-cell'
  tag: 'td' | 'th'
  isHeader: boolean
  colSpan: number
  rowSpan: number
  style: RNStyle
  control: ControlStyle
  attribs: Record<string, string>
  children: BlockChild[]
  key: string
}

export interface FillerSlot {
  type: 'table-filler'
  key: string
}

export type RowItem = TableCellNode | FillerSlot
```

Then replace the two union aliases:

```ts
export type InlineChild = InlineNode | TextNode | LineBreakNode
export type BlockChild = BlockNode | InlineContainerNode | TableNode
export type RenderNode =
  | BlockNode
  | InlineContainerNode
  | InlineNode
  | TextNode
  | LineBreakNode
  | TableNode
  | TableRowNode
  | TableCellNode
  | FillerSlot
```

- [ ] **Step 2: Export the new types**

In `packages/core/src/index.ts`, add to the `export type { ... }` block:

```ts
export type {
  RenderNode,
  BlockNode,
  InlineContainerNode,
  InlineNode,
  TextNode,
  LineBreakNode,
  BlockChild,
  InlineChild,
  ListMarker,
  WhiteSpace,
  RNStyle,
  ControlStyle,
  TableNode,
  TableRowNode,
  TableCellNode,
  FillerSlot,
  RowItem,
} from './types'
```

- [ ] **Step 3: Verify it typechecks**

Run: `pnpm --filter @yk-yong/react-native-richtext-core typecheck`
Expected: PASS (no type errors; `process-text.ts`/`markers.ts` still compile because their `BlockChild` loops keep their existing `else`/`continue` branches — the new `'table'` member is handled in Tasks 5–6, but the current code's branching does not break compilation since they switch on `node.type === 'block'` first).

> Note: if typecheck flags `process-text.ts` because `processContainer(node)` now receives a `TableNode` in its `else` branch, proceed directly to Task 6's edit for that file before committing — but verify first; with the current `if (node.type === 'block') ... else ...` shape, `node` in the `else` is `InlineContainerNode | TableNode`, which **will** error. If so, apply Task 6 Step 3 (process-text) and Task 6 Step 4 (markers) now, then run typecheck again before committing this task.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts
git commit -m "feat(core): add table render-tree node types"
```

---

## Task 4: Core — pure grid normalizer (`normalizeGrid`)

**Files:**

- Create: `packages/core/src/table-grid.ts`
- Test: `packages/core/test/table-grid.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/table-grid.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { normalizeGrid, type RawRow } from '../src/table-grid'
import type { TableCellNode, TableRowNode } from '../src/types'

let cellCounter = 0
const cell = (colSpan = 1, rowSpan = 1, tag: 'td' | 'th' = 'td'): TableCellNode => ({
  type: 'table-cell',
  tag,
  isHeader: tag === 'th',
  colSpan,
  rowSpan,
  style: {},
  control: { display: 'table-cell', whiteSpace: 'normal' },
  attribs: {},
  children: [],
  key: `c${cellCounter++}`,
})

let rowCounter = 0
const row = (cells: TableCellNode[], isHeader = false, key = `r${rowCounter++}`): RawRow => ({
  isHeader,
  style: {},
  attribs: {},
  cells,
  key,
})

const weights = (r: TableRowNode): number[] =>
  r.items.map((it) => (it.type === 'table-cell' ? it.colSpan : 1))
const kinds = (r: TableRowNode): string[] => r.items.map((it) => it.type)

describe('normalizeGrid', () => {
  it('lays out a plain 2x2 grid', () => {
    const { rows, columnCount } = normalizeGrid([row([cell(), cell()]), row([cell(), cell()])])
    expect(columnCount).toBe(2)
    expect(rows.map(kinds)).toEqual([
      ['table-cell', 'table-cell'],
      ['table-cell', 'table-cell'],
    ])
  })

  it('widens a colspan cell and keeps the row weight sum equal to columnCount', () => {
    const { rows, columnCount } = normalizeGrid([
      row([cell(2), cell()]),
      row([cell(), cell(), cell()]),
    ])
    expect(columnCount).toBe(3)
    expect(weights(rows[0]!)).toEqual([2, 1])
    expect(weights(rows[0]!).reduce((a, b) => a + b, 0)).toBe(3)
    expect(weights(rows[1]!)).toEqual([1, 1, 1])
  })

  it('models a rowspan as a filler in the row below', () => {
    const { rows, columnCount } = normalizeGrid([row([cell(1, 2), cell()]), row([cell()])])
    expect(columnCount).toBe(2)
    expect(kinds(rows[0]!)).toEqual(['table-cell', 'table-cell'])
    expect(kinds(rows[1]!)).toEqual(['table-filler', 'table-cell'])
  })

  it('pads short rows with trailing fillers', () => {
    const { rows, columnCount } = normalizeGrid([row([cell(), cell(), cell()]), row([cell()])])
    expect(columnCount).toBe(3)
    expect(kinds(rows[1]!)).toEqual(['table-cell', 'table-filler', 'table-filler'])
  })

  it('combines colspan and rowspan footprints', () => {
    const { rows, columnCount } = normalizeGrid([row([cell(2, 2), cell()]), row([cell()])])
    expect(columnCount).toBe(3)
    expect(weights(rows[0]!)).toEqual([2, 1])
    expect(kinds(rows[1]!)).toEqual(['table-filler', 'table-filler', 'table-cell'])
  })

  it('gives fillers stable keys derived from the row key', () => {
    const { rows } = normalizeGrid([row([cell(1, 2)], false, 'r0'), row([], false, 'r1')])
    const filler = rows[1]!.items[0]!
    expect(filler.type).toBe('table-filler')
    expect(filler.key).toBe('r1:f0')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @yk-yong/react-native-richtext-core test table-grid`
Expected: FAIL — `Failed to resolve import "../src/table-grid"` / `normalizeGrid is not a function`.

- [ ] **Step 3: Implement `normalizeGrid`**

Create `packages/core/src/table-grid.ts`:

```ts
import type { RNStyle, RowItem, TableCellNode, TableRowNode } from './types'

/** A table row before grid normalization: its origin cells in document order. */
export interface RawRow {
  isHeader: boolean
  style: RNStyle
  attribs: Record<string, string>
  cells: TableCellNode[]
  key: string
}

/**
 * Resolve colspan/rowspan into a fixed grid. Each output row's `items` cover every
 * column exactly once: an origin cell (weight = colSpan, which absorbs the columns it
 * spans) or a FillerSlot (weight 1) for a column covered by a rowspan from above or a
 * short row. Invariant: for every row, Σ weights === columnCount.
 */
export function normalizeGrid(rawRows: RawRow[]): { rows: TableRowNode[]; columnCount: number } {
  const occupied: Set<number>[] = []
  const ensure = (r: number): void => {
    while (occupied.length <= r) occupied.push(new Set<number>())
  }
  const placements: Map<number, TableCellNode>[] = rawRows.map(() => new Map())
  let columnCount = 0

  // Phase A — place each cell at the first free column, marking its colSpan×rowSpan footprint.
  rawRows.forEach((rawRow, r) => {
    ensure(r)
    let col = 0
    for (const cell of rawRow.cells) {
      while (occupied[r]!.has(col)) col++
      placements[r]!.set(col, cell)
      for (let dr = 0; dr < cell.rowSpan; dr++) {
        ensure(r + dr)
        for (let dc = 0; dc < cell.colSpan; dc++) occupied[r + dr]!.add(col + dc)
      }
      col += cell.colSpan
      if (col > columnCount) columnCount = col
    }
  })
  // Account for rowspans that extend the occupied width past any placed cell.
  for (const set of occupied) {
    for (const c of set) if (c + 1 > columnCount) columnCount = c + 1
  }

  // Phase B — linearize each row left-to-right into cells + fillers.
  const rows: TableRowNode[] = rawRows.map((rawRow, r) => {
    const items: RowItem[] = []
    for (let col = 0; col < columnCount; col++) {
      const cell = placements[r]!.get(col)
      if (cell) {
        items.push(cell)
        col += cell.colSpan - 1
      } else {
        items.push({ type: 'table-filler', key: `${rawRow.key}:f${col}` })
      }
    }
    return {
      type: 'table-row',
      isHeader: rawRow.isHeader,
      style: rawRow.style,
      attribs: rawRow.attribs,
      items,
      key: rawRow.key,
    }
  })

  return { rows, columnCount }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @yk-yong/react-native-richtext-core test table-grid`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/table-grid.ts packages/core/test/table-grid.test.ts
git commit -m "feat(core): add pure table grid normalizer (colspan/rowspan)"
```

---

## Task 5: Core — `buildTable` in the split phase

**Files:**

- Modify: `packages/core/src/classify.ts:29-31` (`isBlockLevel`)
- Modify: `packages/core/src/split.ts`
- Test: `packages/core/test/table.test.ts`, `packages/core/test/classify.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/test/table.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parse } from '@yk-yong/react-native-richtext-dom'
import { resolveStyles } from '@yk-yong/react-native-richtext-css'
import { splitDocument } from '../src/split'
import { processText } from '../src/text/process-text'
import { annotateMarkers } from '../src/markers'
import type { TableNode } from '../src/types'

const build = (html: string) => {
  const doc = parse(html)
  const { styles } = resolveStyles(doc)
  return annotateMarkers(processText(splitDocument(doc, styles)))
}
const firstTable = (html: string): TableNode => {
  const t = build(html).find((n) => n.type === 'table')
  if (!t || t.type !== 'table') throw new Error('no table found')
  return t
}

describe('buildTable', () => {
  it('builds a TableNode for <table>', () => {
    const t = firstTable('<table><tr><td>a</td><td>b</td></tr></table>')
    expect(t.type).toBe('table')
    expect(t.columnCount).toBe(2)
    expect(t.rows).toHaveLength(1)
    expect(t.rows[0]!.items).toHaveLength(2)
  })

  it('orders thead rows before tbody and tfoot', () => {
    const t = firstTable(
      '<table>' +
        '<tfoot><tr><td>f</td></tr></tfoot>' +
        '<tbody><tr><td>b</td></tr></tbody>' +
        '<thead><tr><td>h</td></tr></thead>' +
        '</table>',
    )
    const cellText = (rowIdx: number): string => {
      const item = t.rows[rowIdx]!.items[0]!
      return item.type === 'table-cell' ? JSON.stringify(item.children) : ''
    }
    expect(t.rows[0]!.isHeader).toBe(true)
    expect(cellText(0)).toContain('h')
    expect(cellText(1)).toContain('b')
    expect(cellText(2)).toContain('f')
  })

  it('ignores whitespace between rows and cells', () => {
    const t = firstTable('<table>\n  <tr>\n    <td>a</td>\n    <td>b</td>\n  </tr>\n</table>')
    expect(t.rows).toHaveLength(1)
    expect(t.rows[0]!.items).toHaveLength(2)
  })

  it('reads colspan as the cell weight', () => {
    const t = firstTable(
      '<table><tr><td colspan="2">a</td></tr><tr><td>b</td><td>c</td></tr></table>',
    )
    expect(t.columnCount).toBe(2)
    const c = t.rows[0]!.items[0]!
    expect(c.type === 'table-cell' && c.colSpan).toBe(2)
  })

  it('models rowspan with a filler in the next row', () => {
    const t = firstTable(
      '<table><tr><td rowspan="2">a</td><td>b</td></tr><tr><td>c</td></tr></table>',
    )
    expect(t.columnCount).toBe(2)
    expect(t.rows[1]!.items[0]!.type).toBe('table-filler')
    expect(t.rows[1]!.items[1]!.type).toBe('table-cell')
  })

  it('extracts a caption', () => {
    const t = firstTable('<table><caption>Cap</caption><tr><td>a</td></tr></table>')
    expect(JSON.stringify(t.caption)).toContain('Cap')
  })

  it('marks th cells as headers', () => {
    const t = firstTable('<table><tr><th>H</th></tr></table>')
    const c = t.rows[0]!.items[0]!
    expect(c.type === 'table-cell' && c.tag).toBe('th')
    expect(c.type === 'table-cell' && c.isHeader).toBe(true)
  })

  it('supports a nested table inside a cell', () => {
    const t = firstTable('<table><tr><td><table><tr><td>inner</td></tr></table></td></tr></table>')
    const c = t.rows[0]!.items[0]!
    expect(c.type === 'table-cell' && JSON.stringify(c.children)).toContain('"type":"table"')
  })
})
```

In `packages/core/test/classify.test.ts`, add an assertion that `'table'` is block-level (match the file's existing import of `isBlockLevel`):

```ts
it('treats table as block-level', () => {
  expect(isBlockLevel('table')).toBe(true)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @yk-yong/react-native-richtext-core test table classify`
Expected: FAIL — `<table>` currently renders as inline (no `table` branch), so `find((n) => n.type === 'table')` returns undefined → "no table found"; `isBlockLevel('table')` is `false`.

- [ ] **Step 3: Make `table` block-level**

In `packages/core/src/classify.ts`, update `isBlockLevel` (lines 29–31):

```ts
export function isBlockLevel(display: Display): boolean {
  return display === 'block' || display === 'list-item' || display === 'table'
}
```

- [ ] **Step 4: Add `buildTable` and dispatch to it**

In `packages/core/src/split.ts`, update the imports and the block branch, then add the table builders.

First, extend the type imports (the `import type { ... } from './types'` block) to add `TableCellNode` and `TableNode`, and add a new import for the grid:

```ts
import type {
  BlockChild,
  BlockNode,
  ControlStyle,
  InlineChild,
  InlineNode,
  LineBreakNode,
  RNStyle,
  TableCellNode,
  TableNode,
  WhiteSpace,
} from './types'
import { normalizeGrid, type RawRow } from './table-grid'
```

In `buildBlockContext`, change the block branch to call a dispatcher:

```ts
    if (isBlockLevel(displayOf(node, styles))) {
      flush()
      result.push(buildBlockLevel(node, key, styles))
    } else {
```

Add these functions (place them after `buildBlock`):

```ts
function buildBlockLevel(el: Element, key: string, styles: Styles): BlockNode | TableNode {
  if (displayOf(el, styles) === 'table') return buildTable(el, key, styles)
  return buildBlock(el, key, styles)
}

function clampSpan(value: string | undefined): number {
  if (value === undefined) return 1
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

function buildCell(el: Element, key: string, styles: Styles): TableCellNode {
  const cs = styles.get(el)
  const style = cs?.style ?? EMPTY_STYLE
  const control = cs?.control ?? DEFAULT_CONTROL
  const isHeader = el.name === 'th'
  const children = buildBlockContext(
    el.children as AnyNode[],
    style,
    control.whiteSpace,
    key,
    styles,
  )
  return {
    type: 'table-cell',
    tag: isHeader ? 'th' : 'td',
    isHeader,
    colSpan: clampSpan(el.attribs.colspan),
    rowSpan: clampSpan(el.attribs.rowspan),
    style,
    control,
    attribs: el.attribs,
    children,
    key,
  }
}

function buildRow(tr: Element, key: string, styles: Styles, isHeader: boolean): RawRow {
  const cs = styles.get(tr)
  const cells: TableCellNode[] = []
  ;(tr.children as AnyNode[]).forEach((child, i) => {
    if (isTag(child) && (child.name === 'td' || child.name === 'th')) {
      cells.push(buildCell(child, childKey(key, i), styles))
    }
  })
  return { isHeader, style: cs?.style ?? EMPTY_STYLE, attribs: tr.attribs, cells, key }
}

function collectSectionRows(
  section: Element,
  key: string,
  styles: Styles,
  isHeader: boolean,
  out: RawRow[],
): void {
  ;(section.children as AnyNode[]).forEach((child, i) => {
    if (isTag(child) && child.name === 'tr') {
      out.push(buildRow(child, childKey(key, i), styles, isHeader))
    }
  })
}

function buildTable(el: Element, key: string, styles: Styles): TableNode {
  const cs = styles.get(el)
  const style = cs?.style ?? EMPTY_STYLE
  const control = cs?.control ?? DEFAULT_CONTROL

  let caption: BlockChild[] | undefined
  const headRows: RawRow[] = []
  const bodyRows: RawRow[] = []
  const footRows: RawRow[] = []

  ;(el.children as AnyNode[]).forEach((child, i) => {
    if (!isTag(child)) return
    const childK = childKey(key, i)
    switch (child.name) {
      case 'caption': {
        if (caption === undefined) {
          const ccs = styles.get(child)
          caption = buildBlockContext(
            child.children as AnyNode[],
            ccs?.style ?? EMPTY_STYLE,
            ccs?.control.whiteSpace ?? 'normal',
            childK,
            styles,
          )
        }
        return
      }
      case 'thead':
        collectSectionRows(child, childK, styles, true, headRows)
        return
      case 'tbody':
        collectSectionRows(child, childK, styles, false, bodyRows)
        return
      case 'tfoot':
        collectSectionRows(child, childK, styles, false, footRows)
        return
      case 'tr':
        bodyRows.push(buildRow(child, childK, styles, false))
        return
      default:
        return // colgroup/col/unknown ignored in 4a
    }
  })

  const { rows, columnCount } = normalizeGrid([...headRows, ...bodyRows, ...footRows])
  return {
    type: 'table',
    tag: 'table',
    style,
    control,
    attribs: el.attribs,
    caption,
    columnCount,
    rows,
    key,
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @yk-yong/react-native-richtext-core test table classify`
Expected: PASS for `classify` and all `buildTable` cases EXCEPT possibly the nested-table and caption assertions that depend on the text pass — those are covered by Task 6. The structural cases (`columnCount`, `colspan`, `rowspan`, `th`, ordering, whitespace-between-cells, nested `type:"table"` presence) pass now. The `caption` containing `Cap` passes too (caption text is built; the text pass only collapses/decodes it).

> If the nested-table test fails because the inner table's cell text isn't processed, that's expected until Task 6 — re-run after Task 6. Do not block this commit on it; it asserts only `"type":"table"` presence, which holds now.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/classify.ts packages/core/src/split.ts packages/core/test/table.test.ts packages/core/test/classify.test.ts
git commit -m "feat(core): build TableNode from table DOM in the split phase"
```

---

## Task 6: Core — text + marker passes recurse into tables

**Files:**

- Modify: `packages/core/src/text/process-text.ts:61-73`
- Modify: `packages/core/src/markers.ts:23-50`
- Test: `packages/core/test/table.test.ts` (add cases)

- [ ] **Step 1: Write the failing tests**

Add to `packages/core/test/table.test.ts` inside `describe('buildTable', ...)`:

```ts
it('collapses whitespace inside a cell', () => {
  const t = firstTable('<table><tr><td>  a   b  </td></tr></table>')
  const c = t.rows[0]!.items[0]!
  const json = c.type === 'table-cell' ? JSON.stringify(c.children) : ''
  expect(json).toContain('a b')
  expect(json).not.toContain('a   b')
})

it('annotates list markers inside a cell', () => {
  const t = firstTable('<table><tr><td><ul><li>x</li></ul></td></tr></table>')
  expect(JSON.stringify(t)).toContain('•')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @yk-yong/react-native-richtext-core test table`
Expected: FAIL — cell text is not collapsed (still `a   b`); the `<li>` inside a cell has no marker (no `•`).

> If Task 3's typecheck note already forced these edits, this test may already pass — in that case confirm green and skip to Step 5 (commit any remaining test additions).

- [ ] **Step 3: Recurse `processText` into tables**

In `packages/core/src/text/process-text.ts`, replace the `processText` function (lines 61–73):

```ts
/** Decode + collapse every inline-container in the tree; drop empty containers. */
export function processText(nodes: BlockChild[]): BlockChild[] {
  const result: BlockChild[] = []
  for (const node of nodes) {
    if (node.type === 'block') {
      node.children = processText(node.children)
      result.push(node)
    } else if (node.type === 'table') {
      if (node.caption) node.caption = processText(node.caption)
      for (const row of node.rows) {
        for (const item of row.items) {
          if (item.type === 'table-cell') item.children = processText(item.children)
        }
      }
      result.push(node)
    } else {
      const processed = processContainer(node)
      if (processed) result.push(processed)
    }
  }
  return result
}
```

- [ ] **Step 4: Recurse `annotateMarkers` into tables**

In `packages/core/src/markers.ts`, replace the body loop of `annotateMarkers` (lines 23–50) so the table branch comes first:

```ts
/** Annotate each <li> in the tree with its list marker. Mutates in place; returns the tree. */
export function annotateMarkers(nodes: BlockChild[]): BlockChild[] {
  for (const node of nodes) {
    if (node.type === 'table') {
      if (node.caption) annotateMarkers(node.caption)
      for (const row of node.rows) {
        for (const item of row.items) {
          if (item.type === 'table-cell') annotateMarkers(item.children)
        }
      }
      continue
    }
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

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @yk-yong/react-native-richtext-core test`
Expected: PASS (all core tests, including the full `table.test.ts` suite).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/text/process-text.ts packages/core/src/markers.ts packages/core/test/table.test.ts
git commit -m "feat(core): recurse text and marker passes into table cells"
```

---

## Task 7: react-native — `TableCell` + `TableRow` components

**Files:**

- Create: `packages/react-native/src/renderers/TableCell.tsx`
- Create: `packages/react-native/src/renderers/TableRow.tsx`
- Test: `packages/react-native/test/table.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/react-native/test/table.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View } from 'react-native'
import { TableCell } from '../src/renderers/TableCell'
import { TableRow } from '../src/renderers/TableRow'
import type { TableCellNode, TableRowNode } from '@yk-yong/react-native-richtext-core'

const cellNode = (colSpan = 1): TableCellNode => ({
  type: 'table-cell',
  tag: 'td',
  isHeader: false,
  colSpan,
  rowSpan: 1,
  style: {},
  control: { display: 'table-cell', whiteSpace: 'normal' },
  attribs: {},
  children: [],
  key: 'c',
})

describe('TableCell', () => {
  it('applies flexGrow equal to colSpan', () => {
    const tree = create(<TableCell node={cellNode(2)} />)
    expect(tree.root.findByType(View).props.style).toContainEqual({
      flexGrow: 2,
      flexBasis: 0,
      flexShrink: 1,
    })
  })
})

describe('TableRow', () => {
  it('lays cells out in a row', () => {
    const rowNode: TableRowNode = {
      type: 'table-row',
      isHeader: false,
      style: {},
      attribs: {},
      items: [],
      key: 'r',
    }
    const tree = create(<TableRow node={rowNode} />)
    expect(tree.root.findByType(View).props.style).toContainEqual({
      flexDirection: 'row',
      alignItems: 'stretch',
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @yk-yong/react-native-richtext test table`
Expected: FAIL — cannot resolve `../src/renderers/TableCell` / `../src/renderers/TableRow`.

- [ ] **Step 3: Implement the components**

Create `packages/react-native/src/renderers/TableCell.tsx`:

```tsx
import { View } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { TableCellNode } from '@yk-yong/react-native-richtext-core'

export function TableCell({ node, children }: RendererProps) {
  const cell = node as TableCellNode
  const { view } = splitStyle(cell.style)
  return (
    <View style={[view, { flexGrow: cell.colSpan, flexBasis: 0, flexShrink: 1 }]}>{children}</View>
  )
}
```

Create `packages/react-native/src/renderers/TableRow.tsx`:

```tsx
import { View } from 'react-native'
import { splitStyle } from '../style/split-style'
import type { RendererProps } from '../types'
import type { TableRowNode } from '@yk-yong/react-native-richtext-core'

export function TableRow({ node, children }: RendererProps) {
  const row = node as TableRowNode
  const { view } = splitStyle(row.style)
  return <View style={[view, { flexDirection: 'row', alignItems: 'stretch' }]}>{children}</View>
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @yk-yong/react-native-richtext test table`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/react-native/src/renderers/TableCell.tsx packages/react-native/src/renderers/TableRow.tsx packages/react-native/test/table.test.tsx
git commit -m "feat(react-native): add TableCell and TableRow renderers"
```

---

## Task 8: react-native — `Table` component, dispatch, defaults

**Files:**

- Create: `packages/react-native/src/renderers/Table.tsx`
- Modify: `packages/react-native/src/NodeRenderer.tsx`
- Modify: `packages/react-native/src/renderers/defaults.ts`
- Test: `packages/react-native/test/table.test.tsx` (add cases)

- [ ] **Step 1: Write the failing tests**

Add to `packages/react-native/test/table.test.tsx` (add imports at top, then the new describes):

```tsx
import { Table } from '../src/renderers/Table'
import { defaultRenderers } from '../src/renderers/defaults'
import { RichTextContext } from '../src/context'
import type { Renderer } from '../src/types'
import type { TableNode } from '@yk-yong/react-native-richtext-core'

const ctxValue = (registry: Record<string, Renderer> = defaultRenderers) => ({
  registry,
  fonts: undefined,
  onLinkPress: () => {},
})
const wrapTable = (ui: React.ReactNode, registry?: Record<string, Renderer>) =>
  create(<RichTextContext.Provider value={ctxValue(registry)}>{ui}</RichTextContext.Provider>)

const tableNode = (overrides: Partial<TableNode> = {}): TableNode => ({
  type: 'table',
  tag: 'table',
  style: {},
  control: { display: 'table', whiteSpace: 'normal' },
  attribs: {},
  columnCount: 2,
  rows: [
    {
      type: 'table-row',
      isHeader: false,
      style: {},
      attribs: {},
      key: 'r0',
      items: [
        {
          type: 'table-cell',
          tag: 'td',
          isHeader: false,
          colSpan: 1,
          rowSpan: 1,
          style: {},
          control: { display: 'table-cell', whiteSpace: 'normal' },
          attribs: {},
          children: [],
          key: 'r0.0',
        },
        { type: 'table-filler', key: 'r0:f1' },
      ],
    },
  ],
  ...overrides,
})

describe('Table', () => {
  it('renders a filler View for filler slots', () => {
    const tree = wrapTable(<Table node={tableNode()} />)
    const fillers = tree.root.findAllByType(View).filter((v) => {
      const s = v.props.style as Record<string, unknown> | undefined
      return s != null && s.flexGrow === 1 && s.flexBasis === 0 && !('flexShrink' in s)
    })
    expect(fillers).toHaveLength(1)
  })

  it('renders a caption above the rows', () => {
    const node = tableNode({
      caption: [
        {
          type: 'inline-container',
          style: {},
          whiteSpace: 'normal',
          key: 'cap',
          children: [{ type: 'text', text: 'Cap', key: 'cap.0' }],
        },
      ],
    })
    const tree = wrapTable(<Table node={node} />)
    expect(JSON.stringify(tree.toJSON())).toContain('Cap')
  })

  it('applies the legacy border attribute as collapse-style cell borders', () => {
    const tree = wrapTable(<Table node={tableNode({ attribs: { border: '1' } })} />)
    const bordered = tree.root.findAllByType(View).find((v) => {
      const s = v.props.style as unknown[] | undefined
      return Array.isArray(s) && s.some((x) => (x as Record<string, unknown>)?.borderTopWidth === 1)
    })
    expect(bordered).toBeDefined()
  })

  it('lets a consumer override td via the registry', () => {
    const MyCell: Renderer = ({ children }) => <View testID="custom-cell">{children}</View>
    const tree = wrapTable(<Table node={tableNode()} />, { ...defaultRenderers, td: MyCell })
    const custom = tree.root.findAllByType(View).find((v) => v.props.testID === 'custom-cell')
    expect(custom).toBeDefined()
  })
})

describe('defaultRenderers (table)', () => {
  it('registers the table renderers', () => {
    expect(defaultRenderers.table).toBe(Table)
    expect(defaultRenderers.td).toBe(TableCell)
    expect(defaultRenderers.th).toBe(TableCell)
    expect(defaultRenderers.tr).toBe(TableRow)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @yk-yong/react-native-richtext test table`
Expected: FAIL — cannot resolve `../src/renderers/Table`; `defaultRenderers.table` is undefined.

- [ ] **Step 3: Implement the `Table` component**

Create `packages/react-native/src/renderers/Table.tsx`:

```tsx
import { View } from 'react-native'
import { useRichTextContext } from '../context'
import { NodeRenderer } from '../NodeRenderer'
import { splitStyle } from '../style/split-style'
import { TableRow } from './TableRow'
import { TableCell } from './TableCell'
import type { RendererProps } from '../types'
import type { TableCellNode, TableNode } from '@yk-yong/react-native-richtext-core'

const BORDER_COLOR = '#000000'

function parseBorder(value: string | undefined): number {
  if (value === undefined) return 0
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Collapse approximation: top+left on each cell, bottom+right on the table box. */
function cellWithBorder(cell: TableCellNode, borderW: number): TableCellNode {
  if (borderW <= 0) return cell
  return {
    ...cell,
    style: {
      ...cell.style,
      borderTopWidth: borderW,
      borderLeftWidth: borderW,
      borderColor: cell.style.borderColor ?? BORDER_COLOR,
    },
  }
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

  return (
    <View style={view}>
      {table.caption?.map((c) => (
        <NodeRenderer key={c.key} node={c} />
      ))}
      <View style={tableBorder}>
        {table.rows.map((row) => (
          <RowComp key={row.key} node={row}>
            {row.items.map((item) => {
              if (item.type === 'table-filler') {
                return <View key={item.key} style={{ flexGrow: 1, flexBasis: 0 }} />
              }
              const CellComp = registry[item.tag] ?? TableCell
              return (
                <CellComp key={item.key} node={cellWithBorder(item, borderW)}>
                  {item.children.map((c) => (
                    <NodeRenderer key={c.key} node={c} />
                  ))}
                </CellComp>
              )
            })}
          </RowComp>
        ))}
      </View>
    </View>
  )
}
```

- [ ] **Step 4: Add the `table` dispatch case**

In `packages/react-native/src/NodeRenderer.tsx`, add the import and a new case. Add to the imports:

```tsx
import { Table } from './renderers/Table'
```

Add this case inside the `switch (node.type)` block, after the `block` case:

```tsx
    case 'table': {
      const Comp = registry['table'] ?? Table
      return <Comp node={node} />
    }
```

- [ ] **Step 5: Register the table renderers**

In `packages/react-native/src/renderers/defaults.ts`, replace the file:

```ts
import { Anchor } from './Anchor'
import { ListItem } from './ListItem'
import { Rule } from './Rule'
import { Img } from './Img'
import { Pre } from './Pre'
import { Table } from './Table'
import { TableRow } from './TableRow'
import { TableCell } from './TableCell'
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
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @yk-yong/react-native-richtext test table`
Expected: PASS (all `table.test.tsx` cases).

- [ ] **Step 7: Commit**

```bash
git add packages/react-native/src/renderers/Table.tsx packages/react-native/src/NodeRenderer.tsx packages/react-native/src/renderers/defaults.ts packages/react-native/test/table.test.tsx
git commit -m "feat(react-native): add Table renderer, dispatch, and registry defaults"
```

---

## Task 9: react-native — `<RichText>` table integration

**Files:**

- Create: `packages/react-native/test/table-integration.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/react-native/test/table-integration.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { create } from 'react-test-renderer'
import { View, Text } from 'react-native'
import { RichText } from '../src'

const html =
  '<table border="1">' +
  '<thead><tr><th>Name</th><th colspan="2">Score</th></tr></thead>' +
  '<tbody><tr><td>Ann</td><td>1</td><td>2</td></tr></tbody>' +
  '</table>'

describe('integration: tables', () => {
  it('renders header and body cell text', () => {
    const tree = create(<RichText source={{ html }} />)
    const json = JSON.stringify(tree.toJSON())
    expect(json).toContain('Name')
    expect(json).toContain('Score')
    expect(json).toContain('Ann')
  })

  it('gives the colspan=2 header cell flexGrow 2', () => {
    const tree = create(<RichText source={{ html }} />)
    const hasColspan = tree.root.findAllByType(View).some((v) => {
      const s = v.props.style as unknown[] | undefined
      return Array.isArray(s) && s.some((x) => (x as Record<string, unknown>)?.flexGrow === 2)
    })
    expect(hasColspan).toBe(true)
  })

  it('centers header text via inherited th styling', () => {
    const tree = create(<RichText source={{ html }} />)
    const centeredHeader = tree.root.findAllByType(Text).some((t) => {
      const s = t.props.style as Record<string, unknown> | undefined
      return s?.textAlign === 'center'
    })
    expect(centeredHeader).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails or passes**

Run: `pnpm --filter @yk-yong/react-native-richtext test table-integration`
Expected: PASS — by this point the full pipeline is wired, so this is a confirmation test. If any case fails, debug the specific stage (e.g. `textAlign` missing → check the `th` UA rule from Task 2 and that `buildCell` passes the cell's computed style as the inline-container owner style).

- [ ] **Step 3: Commit**

```bash
git add packages/react-native/test/table-integration.test.tsx
git commit -m "test(react-native): add RichText table integration test"
```

---

## Task 10: Verify the whole repo + changeset

**Files:**

- Create: `.changeset/phase-4a-tables.md`

- [ ] **Step 1: Run the full workspace gates**

Run each and confirm PASS:

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
```

Expected: all exit 0. If `format:check` fails, run `pnpm format` and re-check. If `lint` fails on the new files, run `pnpm lint:fix` and review.

- [ ] **Step 2: Add a changeset**

Create `.changeset/phase-4a-tables.md`:

```md
---
'@yk-yong/react-native-richtext': minor
'@yk-yong/react-native-richtext-core': minor
'@yk-yong/react-native-richtext-css': minor
---

Add Phase 4a table rendering: `<table>` (with `thead`/`tbody`/`tfoot`/`tr`/`td`/`th`/`caption`),
`colspan`/`rowspan` resolved in a normalized core grid, nested tables, and a deterministic
weighted-column renderer. `colspan` widens cells via flex weight; `rowspan` is modeled in the grid
and rendered flat with filler cells (true vertical spanning and content-proportional column widths
arrive in Phase 4b). `th` is bold/centered; `<table border>` shows grid lines; `table`/`tr`/`td`/`th`
are overridable via the `renderers` prop.
```

- [ ] **Step 3: Commit**

```bash
git add .changeset/phase-4a-tables.md
git commit -m "chore: changeset for Phase 4a tables"
```

- [ ] **Step 4: Final confirmation**

Run: `pnpm test`
Expected: PASS across all packages. The branch `phase-4a-tables` is ready for a PR.

---

## Self-Review

**Spec coverage:**

- Normalized grid model (TableNode, colspan/rowspan via occupancy) → Tasks 3–4. ✅
- `buildTable` trigger on `display: table`, forgiving collection, thead→tbody→tfoot order, implicit tbody, caption → Task 5. ✅
- Text/marker passes recurse into cells → Task 6. ✅
- `ControlStyle.display` table values + `border-collapse` control + UA stylesheet → Tasks 1–2. ✅
- Weighted-flex renderers, colspan weight, filler slots, caption above, `<table border>` collapse approximation, `td`/`th`/`tr`/`table` overridable, dispatch + defaults → Tasks 7–8. ✅
- Testing strategy (core grid coverage, css UA/whitelist, react-native renderer + integration) → Tasks 4–9. ✅
- rowspan modeled-but-flat → Task 4 (filler) + Task 8 (filler View). ✅

**Type consistency:** `TableNode`/`TableRowNode`/`TableCellNode`/`FillerSlot`/`RowItem`, `normalizeGrid`/`RawRow`, `buildTable`/`buildRow`/`buildCell`/`collectSectionRows`/`buildBlockLevel`/`clampSpan`, `Table`/`TableRow`/`TableCell`/`cellWithBorder`/`parseBorder` are used identically across tasks. `RowItem = TableCellNode | FillerSlot`; cell weight = `colSpan`; filler weight = 1; invariant Σ weights === `columnCount`.

**Placeholder scan:** none — every code step shows complete code; every run step states the command and expected result.

**Known soft edges (intentional, per spec out-of-scope):** CSS borders set directly on cells double on shared edges (pixel-perfect collapse → 4b); `colgroup`/`col` and explicit px widths ignored; rowspan renders flat; orphan `<td>`/`<tr>` outside a `<table>` fall through generic rendering.

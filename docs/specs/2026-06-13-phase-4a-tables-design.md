# react-native-richtext — Phase 4 (sub-project 4a): Tables — core grid + CSS + weighted-column renderer

Date: 2026-06-13
Status: Draft for review
Depends on: Phases 0–3b (dom, css, core, react-native, img, list/quote/code polish) — all merged.

## What this is

The first Phase 4 sub-project. Tables are the one remaining major block construct from the
`react-native-render-html` surface, and the goal is **parity**: arbitrary tables including
`colspan`/`rowspan`, nested tables, captions, and header/footer sections.

Phase 4 is split because the hard part — content-proportional column widths — is unsolvable in
Yoga without a two-pass `onLayout` measurement round-trip, which makes the renderer stateful and
async (first-paint reflow). That cost is isolated into **4b**.

- **4a (this spec):** the normalized grid model (`core`, fully unit-tested), `display: table`
  CSS support + UA stylesheet (`css`), and a deterministic **weighted-column** renderer
  (`react-native`) — columns aligned via flex weight, no measurement.
- **4b (later):** measurement-based content-proportional column widths, horizontal scroll for
  wide tables, true vertical `rowspan`, explicit px column widths. 4b reuses 4a's core grid
  untouched.

### The Yoga constraint that drives the split

In a flexbox `row` of cells, **each row computes its cell widths independently**. Column _i_ in
row 1 will not align with column _i_ in row 2 unless we either (a) force every cell in a column to
the same _fixed width_ (needs measurement → 4b), or (b) give every cell the same _flex weight_
(equal/weighted columns, no content sizing → 4a). RN has no CSS grid and cannot measure text width
before layout. 4a takes path (b); 4b adds path (a).

## Decisions locked during brainstorming (do not re-litigate)

| Question                | Decision                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ambition                | **Parity** with `react-native-render-html` table capability — colspan/rowspan, nested tables, captions, sections — reached **incrementally** (4a → 4b).         |
| Column-width strategy   | **4a:** weighted flex columns (equal by default, weight = `colspan`), no measurement. **4b:** two-pass `onLayout` measurement → content-proportional widths.    |
| Where grid logic lives  | **Approach A** — a dedicated normalized `TableNode` grid in the React-free `core` package. The occupancy algorithm is pure and exhaustively unit-tested.        |
| `rowspan` in 4a         | **Modeled fully in core** (correct grid occupancy, so 4b renders it for free); **rendered flat in 4a** — the cell renders only in its origin row, covered positions render as empty filler cells so columns stay aligned. |
| Default table borders   | **Borderless by default** (browser-faithful; honor CSS). Legacy `<table border="N">` bridges to visible cell borders so old CMS HTML shows grid lines.          |
| Cell renderer overrides | `td` / `th` / `tr` are **registry-overridable** in 4a (parity-nice), alongside `table`.                                                                         |

## 1. `core` — normalized grid model

The heart of 4a, and where nearly all correctness coverage lives. React-free, exhaustively
unit-tested.

### 1.1 New render-tree node types — `packages/core/src/types.ts`

```ts
export interface TableNode {
  type: 'table'
  tag: 'table'
  style: RNStyle
  control: ControlStyle
  attribs: Record<string, string>
  caption?: BlockChild[] // rendered above the table; undefined when absent
  columnCount: number // max columns across all rows (after span resolution)
  rows: TableRowNode[] // render order: thead rows, then tbody rows, then tfoot rows
  key: string
}

export interface TableRowNode {
  type: 'table-row'
  isHeader: boolean // true for rows originating in <thead>
  style: RNStyle
  attribs: Record<string, string>
  items: RowItem[] // left-to-right; sum of item weights === columnCount
  key: string
}

export interface TableCellNode {
  type: 'table-cell'
  tag: 'td' | 'th'
  isHeader: boolean // tag === 'th'
  colSpan: number // >= 1; the cell's flex weight
  rowSpan: number // >= 1; modeled here, rendered flat in 4a
  style: RNStyle
  control: ControlStyle
  attribs: Record<string, string>
  children: BlockChild[] // cell content via normal block context (nested tables/lists work)
  key: string
}

export interface FillerSlot {
  type: 'table-filler' // a position covered by a rowspan from a row above; weight 1
  key: string
}

export type RowItem = TableCellNode | FillerSlot
```

`TableNode`, `TableRowNode`, `TableCellNode`, `FillerSlot` join the `RenderNode` union. `TableNode`
is a `BlockChild` (it sits in block flow alongside `BlockNode`/`InlineContainerNode`).

### 1.2 Build trigger — `packages/core/src/split.ts` + `classify.ts`

- `isBlockLevel(display)` gains `display === 'table'` → a `<table>` flushes the preceding inline run
  and starts its own block, exactly like other block elements.
- `buildBlock` checks `control.display === 'table'` and delegates to `buildTable(el, key, styles)`,
  which returns a `TableNode` instead of a generic `BlockNode`. The table's internal tags
  (`thead/tbody/tfoot/tr/td/th/caption/colgroup/col`) are consumed by `buildTable` — the generic
  block walker never recurses into them.

### 1.3 `buildTable` algorithm — `packages/core/src/table.ts` (new module)

1. **Collect.** Walk `<table>` children, tolerating stray text/whitespace and unknown elements
   (forgiving = parity). Recognize sections (`thead`/`tbody`/`tfoot`), loose `<tr>` (implicit
   `tbody`), `<caption>`, and `<colgroup>/<col>` (tolerated, ignored for layout in 4a). Produce an
   ordered row list: **thead rows → tbody rows → tfoot rows**, each row carrying its source cells
   (`<td>`/`<th>`, with stray content between cells ignored) and an `isHeader` flag.
2. **Normalize** via the classic occupancy-matrix sweep. Maintain a set of pending rowspans keyed
   by column. For each row, a column cursor advances left-to-right, skipping columns still occupied
   by a `rowSpan` from above; each cell is placed at the cursor, its footprint
   (`colSpan × rowSpan`) marked, and the cursor advanced by `colSpan`. `columnCount` = max columns
   across rows; short rows are padded with trailing fillers.
3. **Emit** each row as `items`: origin `TableCellNode`s (weight = `colSpan`) interleaved with
   `FillerSlot`s at positions covered by a rowspan from a row above. colspan-covered columns within
   the same row are absorbed into the origin cell's weight (no separate item). Invariant: the sum of
   item weights (`colSpan` for cells, `1` for fillers) equals `columnCount` for every row.

Cell content (`children`) is built with the existing block-context builder, so cells are ordinary
block containers — text, inline runs, lists, and **nested tables** all work via normal recursion
(a nested `display: table` child re-enters `buildTable`).

### 1.4 Later passes become table-aware

- `processText` (whitespace collapse + entity decode + prune) recurses
  `TableNode → caption / rows → cells → children`, treating each cell's `children` as block children.
- `annotateMarkers` recurses the same way, so a `<ul>` inside a `<td>` gets list markers.

## 2. `css` — display values + UA stylesheet

### 2.1 `ControlStyle.display` union — `packages/css/src/types.ts`

Add the table display values:

```ts
display:
  | 'block' | 'inline' | 'inline-block' | 'list-item' | 'none'
  | 'table' | 'table-row' | 'table-row-group' | 'table-header-group'
  | 'table-footer-group' | 'table-cell' | 'table-caption'
  | 'table-column' | 'table-column-group'
```

`core` branches on `display: table` for the container, then walks the subtree **by tag**; the other
values exist so the UA sheet and consumer CSS aren't dropped on the floor (and so 4b/future CSS-driven
`display: table` on non-`<table>` elements has a path).

### 2.2 Table control props

`border-collapse` and `border-spacing` are not RN style keys → route to `control` (via the
CONTROL_PROPS whitelist + `mapDeclaration`), not `style`. They are used minimally in 4a (see §3.3).

`colspan`/`rowspan`/`<col width>` are **HTML attributes**, not CSS — read from `attribs` in core;
no whitelist change.

### 2.3 UA stylesheet — `packages/css/src/ua/ua-stylesheet.ts`

Browser-faithful defaults (tables are **borderless** unless CSS/`border` attr says otherwise):

```
table   { display: table; border-collapse: collapse }
thead   { display: table-header-group }
tbody   { display: table-row-group }
tfoot   { display: table-footer-group }
tr      { display: table-row }
td      { display: table-cell; padding: 2px }
th      { display: table-cell; padding: 2px; font-weight: bold; text-align: center }
caption { display: table-caption; text-align: center }
```

## 3. `react-native` — weighted-column renderers

### 3.1 Dispatch — `packages/react-native/src/NodeRenderer.tsx`

Add `case 'table'`: `const Comp = registry['table'] ?? Table; return <Comp node={node} />`. The
`Table` component owns row/cell layout internally (rows and cells are not independently
registry-dispatched at the `NodeRenderer` level), but it **looks up overrides** for `tr`/`td`/`th`
from the registry (§3.4).

### 3.2 Components — `packages/react-native/src/renderers/Table.tsx` (+ `TableRow`, `TableCell`)

- `Table`: renders `caption` (if present) above, then a `<View>` (table box style) containing rows.
- `TableRow`: `<View style={[rowStyle, { flexDirection: 'row', alignItems: 'stretch' }]}>`.
  `alignItems: 'stretch'` makes all cells in a row equal height for free.
- `TableCell`: `<View style={[cellStyle, { flexGrow: colSpan, flexBasis: 0, flexShrink: 1 }]}>`
  with content rendered via `<NodeRenderer>` over `children`. Equal `flexBasis: 0` + `flexGrow`
  weighting gives equal columns, with a `colspan = N` cell taking N columns' share.
- `FillerSlot`: `<View style={{ flexGrow: 1, flexBasis: 0 }} />` (keeps columns aligned where a
  rowspan from above covers a position).

### 3.3 Borders (4a)

Default: borderless. When borders are requested via CSS or the legacy `<table border="N">`
attribute, approximate `border-collapse: collapse` with single (non-doubled) lines by drawing
**top + left** border on each cell and **bottom + right** on the table box. `border-spacing` /
the separate model / pixel-perfect collapse → 4b polish.

### 3.4 Overridable cells

`Table` resolves each cell/row component from the registry: `registry[cell.tag] ?? TableCell`,
`registry['tr'] ?? TableRow`. So `renderers={{ td: MyCell, th: MyHeader }}` restyles cells.
`table`, `tr`, `td`, `th` are all overridable. Register `table` (and the internal defaults) in
`defaultRenderers`.

## 4. Testing strategy (TDD; no snapshots)

- **core** (most coverage): `buildTable` normalization — plain grid; `colspan`; `rowspan`; both
  combined; ragged/short rows padded to `columnCount`; implicit `tbody`; `thead`/`tfoot` reordering;
  stray-whitespace/text tolerance; `caption` extraction; nested table inside a cell; row-item weight
  invariant (Σ weights === `columnCount`). `processText`/`annotateMarkers` recursion into cells
  (whitespace collapse in a cell; `<ul>` in a `<td>` gets markers).
- **css**: `buildUaRules` asserts `table` → `display: table`, `th` → `fontWeight: bold` +
  `textAlign: center`; `border-collapse` lands in `control`, not `style`.
- **react-native**: a `table` renders N row `View`s; a `colspan=2` cell has `flexGrow: 2`; a
  rowspan-covered position renders a filler `View`; `caption` renders above the rows;
  `renderers={{ td }}` override wins; `defaultRenderers.table === Table`.
- **integration** (`<RichText>`): a CMS-style `<table>` with a `<thead>` header row and a body row
  containing a `colspan` renders aligned columns with bold/centered headers.

## Deliverable

`<table>` (with `thead/tbody/tfoot/tr/td/th/caption`) renders as aligned weighted-flex columns;
`colspan` widens cells; `rowspan` is correctly modeled in the core grid and rendered flat with
fillers; nested tables and lists-in-cells work; `th` is bold + centered; `<table border>` shows
grid lines; `td/th/tr/table` are consumer-overridable. Green CI. core grid model + CSS UA/display
+ react-native table renderers.

## Out of scope (this cycle → 4b or later)

- Measurement-based content-proportional column widths (4b).
- Horizontal scroll for tables wider than the container (4b).
- True vertical `rowspan` rendering (4b; the grid already models it).
- Honoring explicit px column widths — `<col width>`, cell `width` (4b).
- `border-spacing` / separate border model / pixel-perfect `border-collapse` (4b polish).
- Sticky headers, scroll sync, virtualization, very large tables.
- `colgroup`/`col` layout effects (tolerated/ignored in 4a).
- Orphan `<tr>`/`<td>` outside a `<table>` (malformed; falls through generic rendering).

## Open questions (resolve during planning)

- File layout in core: one `table.ts` (collect + normalize + emit) vs. splitting the pure occupancy
  sweep into its own `grid.ts` for finer unit tests. (Lean: split the pure sweep out.)
- Exact `key` scheme for synthesized `FillerSlot`s and rows (must be stable across re-renders).
- Whether `TableRow`/`TableCell` need their own `NodeRenderer` cases (for symmetry / deeper consumer
  control) or stay internal to `Table` (simpler). (Lean: internal, with registry override lookups.)
- Default cell padding value (`2px` chosen to match browsers; revisit if it looks cramped).
- `<table border="N">` mapping detail: border width/color and whether `N>1` scales width.

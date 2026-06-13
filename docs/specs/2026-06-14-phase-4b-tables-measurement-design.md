# react-native-richtext — Phase 4 (sub-project 4b): Tables — measured column widths + horizontal scroll

Date: 2026-06-14
Status: Draft for review
Depends on: Phases 0–4a (dom, css, core, react-native, tables: grid + weighted-column renderer) — all merged and shipped in 0.2.0.

## What this is

The second Phase 4 sub-project. Phase 4a renders tables with **equal/weighted** flex columns (no
content awareness). 4b replaces that with **content-proportional column widths** computed from a
one-pass `onLayout` measurement of each cell's natural width, plus **horizontal scroll** when the
table is wider than its container. This is the deferred-from-4a "hard part" — it makes the `Table`
renderer stateful and introduces a single post-mount refinement.

In scope: measured column widths, proportional fill, horizontal scroll on overflow, explicit px
widths (`<col width>` and cell `width`). Out: true vertical `rowspan` and border polish (→ 4c).

## Decisions locked during brainstorming (do not re-litigate)

| Question               | Decision                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4b scope               | Measured content-proportional column widths + horizontal scroll + explicit px widths. `rowspan` stays **flat** (4a fillers); border-spacing/collapse → 4c.       |
| Measurement basis      | **max-content per column**, from a single `onLayout` pass. Full CSS auto-layout (min-content + distribution) is **not** done — needs a 2nd constrained pass.     |
| Overflow behavior      | Fits (`Σ widths ≤ container`) → **expand columns proportionally to fill**. Overflows → **natural widths inside a horizontal `ScrollView`**, cells single-line.   |
| Architecture           | Stateful `Table` (onLayout, mirroring the `Img`/`Image.getSize` precedent) + a **pure `column-widths` helper in `react-native`** (tested like `image-style.ts`). |
| Where width math lives | `react-native` (RN-pixel-specific), **not** `core`. `core` stays structural. Rejected: an off-screen measuring probe (double-renders content).                   |

## Important correction vs. the brainstorm

The brainstorm floated "first paint = the exact 4a flex-fill layout, refine after measuring."
That is **infeasible in a single pass**: measuring true max-content requires cells rendered at
**natural** width (no `flexGrow`), which is not the 4a flex-fill look. So:

- **First paint = natural-width layout** (cells shrink-wrap to content), then one refinement to the
  computed widths.
- **Graceful degradation still holds**: if measurement never completes (or is skipped), the table
  renders readable at natural widths — just not 4a's filled columns.

## 1. `react-native` — measurement & data flow (`renderers/Table.tsx`)

`Table` becomes stateful. Two measurements drive it:

- **container width** — `onLayout` on the outer wrapper `View`.
- **per-cell natural width** — `onLayout` on each rendered cell during the measurement render.

State: `container?: number` and a `widths?: Record<columnIndex, number>`-style collector (keyed so a
re-render does not lose prior cell measurements). A `done` guard stops further `onLayout`-driven
state updates once all expected cells have reported (prevents feedback loops); effects clean up on
unmount.

**Render phases:**

1. **Measure** (no computed widths yet): rows are `flexDirection: 'row'`; each cell is
   `flexShrink: 0` with **no** `flexGrow` (so it shrink-wraps to its content's natural width) and an
   `onLayout` that records `{ col, colSpan, width }`. Fillers occupy their column with a width-0
   spacer and are not measured.
2. **Compute**: once `container` and all cell widths are known, call `computeColumnWidths(...)`.
3. **Final**: re-render cells with an explicit `width` per column (a `colSpan=N` cell gets the sum of
   its N columns' widths). If `overflow`, wrap the rows block in a horizontal `ScrollView`; else a
   plain `View` (columns now sum to the container, filling it).

**Skip-measurement fast path:** if every column has an explicit width (`<col>`/cell), skip phase 1
entirely and render final widths directly (no state, no reflow).

The column index for each cell is tracked while iterating `row.items` (cursor advances by `colSpan`
for a cell, `1` for a filler) — the same left-to-right walk 4a already does.

## 2. `react-native` — pure width algorithm (`renderers/column-widths.ts`, tested)

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
  widths: number[] // length === columnCount
  overflow: boolean
}

export function computeColumnWidths(input: ColumnWidthInput): ColumnWidthResult
```

Algorithm:

1. **Per-column max-content** from `colSpan === 1` cells: `maxContent[c] = max(width of span-1 cells in c)`, else `0`.
2. **colspan reconciliation**: for each `colSpan > 1` cell, if `cell.width > Σ maxContent[col..col+span-1]`,
   distribute the deficit **equally** across those columns. (Full per-span constraint solving → 4c.)
3. **target**: `target[c] = explicit[c] ?? maxContent[c]`.
4. **distribute**:
   - `Σ target ≤ container` → expand: spread the slack `container − Σ target` across **non-explicit**
     columns proportional to their `target` (explicit columns are pinned). If every column is
     explicit, leave widths at `target` (table may be narrower than the container). `overflow = false`.
   - `Σ target > container` → `widths = target`; `overflow = true`.
5. Edge: `columnCount === 0` → `{ widths: [], overflow: false }`.

The component only calls this once `container > 0` and all cells measured; until then it stays in the
measure render.

## 3. `core` — explicit `<col>` widths (`split.ts`/`table-grid` types)

Small, pure addition to `buildTable`: parse `<colgroup>`/`<col>` (`width`, `span`) into
`colWidths?: (number | undefined)[]` on `TableNode` (one entry per grid column; `<col span="N">`
repeats its width across N columns; missing/auto → `undefined`). Px and bare-number widths parse to a
number; `%` and other units → `undefined` (deferred). Cell-level explicit width is read in the
renderer from `cell.style.width` / `cell.attribs.width`; per column, a cell width contributes to
`explicit[col]` only for `colSpan === 1` cells (spanning-cell explicit widths → 4c).

`<colgroup>/<col>` are currently tolerated-and-ignored by 4a; this is the first time they carry data.

## 4. Rendering details

- Cell content unchanged from 4a (caption above, `th` bold/centered via inheritance, registry
  overrides for `table`/`tr`/`td`/`th`, flat `rowspan` fillers).
- Final cells set `width` (fixed) instead of `flexGrow`; rows stay `flexDirection: 'row'`,
  `alignItems: 'stretch'` (equal row height retained).
- Overflow `ScrollView`: `horizontal`, `showsHorizontalScrollIndicator` left default; the rows block
  is its single child at natural total width. (Pre-measurement natural render may briefly exceed the
  viewport for wide tables — acceptable one-frame reflow; the plan may opt to always-wrap in the
  ScrollView to avoid the brief clip.)
- Legacy `<table border>` collapse approximation carries over unchanged.

## 5. Testing strategy (TDD; no snapshots)

- **`column-widths.ts`** (most coverage): fits → proportional fill (slack split by target); exact-fit;
  overflow → natural widths + `overflow:true`; explicit pins (not expanded), mixed explicit/measured;
  all-explicit; single column; `columnCount 0`; colspan reconciliation (span cell wider than its
  columns distributes deficit; span cell narrower is a no-op).
- **core**: `<colgroup><col width="80">` → `colWidths[0] === 80`; `<col span="2" width="50">` repeats;
  `<col width="50%">` → `undefined`; no colgroup → `colWidths` undefined/empty.
- **react-native**: fire `onLayout` events (container + cells) in react-test-renderer → assert cells
  receive computed `width`; a wide case renders a `ScrollView` and cells keep natural widths; a
  fitting case fills (Σ widths ≈ container, no `ScrollView`); all-explicit skips the measure render
  (cells have explicit widths on first paint, no `ScrollView` unless overflowing).
- **integration** (`<RichText>`): a fitting `<table>` ends at container width with proportional
  columns; a wide one ends inside a `ScrollView`; `<col width>` is honored.

## Deliverable

Tables size columns to content: narrow columns stay narrow, wide ones get more room; the table fills
its container when it fits and horizontally scrolls when it doesn't; `<col width>`/cell `width` are
honored; everything else from 4a (caption, `th`, overrides, flat rowspan, borders) is preserved.
Green CI. A pure `column-widths` helper + a stateful `Table` + a small `core` `<col>` parse.

## Out of scope (this cycle → 4c or later)

- True vertical `rowspan` rendering (still flat fillers; the grid already models it).
- min-content / full CSS automatic-table-layout distribution (single max-content pass only).
- Wrap/shrink-to-fit overflow (we h-scroll instead).
- `%` column widths; explicit widths on spanning cells; full per-span constraint solving.
- `border-spacing` / separate model / pixel-perfect `border-collapse`.
- Sticky headers, scroll-position sync, virtualization, very large tables.
- Re-measuring on container resize/rotation beyond React's normal `onLayout` re-fire (best-effort).

## Open questions (resolve during planning)

- Whether to **always** wrap rows in the horizontal `ScrollView` (avoids the brief pre-measurement
  clip for wide tables) vs. only when `overflow` (simpler tree). Lean: only-on-overflow.
- The exact state shape for collecting per-cell measurements so re-renders don't drop earlier values
  and the `done` guard fires once (e.g. count expected measurable cells up front).
- Behavior when `container` is measured but some cells report `width: 0` (empty cells) — treat as 0
  and let other columns absorb slack (current plan), confirm acceptable.
- Whether explicit cell `width` should also seed `explicit[col]` when it conflicts across rows (plan:
  first/most-specific wins; spanning cells ignored).

---
'@yk-yong/react-native-richtext': minor
'@yk-yong/react-native-richtext-core': minor
'@yk-yong/react-native-richtext-css': minor
---

Add Phase 4a table rendering: `<table>` (with `thead`/`tbody`/`tfoot`/`tr`/`td`/`th`/`caption`), `colspan`/`rowspan` resolved in a normalized core grid, nested tables, and a deterministic weighted-column renderer. `colspan` widens cells via flex weight; `rowspan` is modeled in the grid and rendered flat with filler cells (true vertical spanning and content-proportional column widths arrive in Phase 4b). `th` is bold/centered; `<table border>` shows grid lines; `table`/`tr`/`td`/`th` are overridable via the `renderers` prop.

---
'@yk-yong/react-native-richtext': minor
'@yk-yong/react-native-richtext-core': minor
---

Phase 4b: table columns are now content-proportional. A single onLayout measurement pass sizes each column to its max-content; the table expands to fill its container when it fits and scrolls horizontally when it doesn't. Explicit `<col width>` and cell `width` are honored (and skip measurement when every column is explicit). rowspan still renders flat; border-spacing/collapse polish remains deferred.

---
'@yk-yong/react-native-richtext-css': patch
'@yk-yong/react-native-richtext': patch
---

Fix `<del>`, `<strike>`, and `<ins>` rendering without their text-decoration. The UA stylesheet covered only `<s>`/`<u>`; add the missing aliases so `<del>`/`<strike>` render with `line-through` and `<ins>` with `underline`, matching browser defaults.

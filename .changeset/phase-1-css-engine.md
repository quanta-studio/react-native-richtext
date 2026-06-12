---
'@yk-yong/rn-rich-text-css': minor
---

Add the CSS engine: `resolveStyles(document, options)` resolves a parsed DOM plus
consumer baseStyle/tagStyles/classStyles, `<style>` blocks, and inline styles into a
fully-computed RN style per element (cascade, specificity, inheritance, relative-unit
resolution, UA stylesheet), with optional diagnostics.

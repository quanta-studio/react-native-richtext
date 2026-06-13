---
'@yk-yong/rn-rich-text-css': patch
---

UA stylesheet: add the HTML5 sectioning/grouping elements (`article`, `section`, `aside`,
`header`, `footer`, `main`, `nav`, `figure`, `figcaption`) as `display: block`. Without this they
fell back to the CSS initial `inline`, which collapsed sectioned CMS markup into a single inline run.

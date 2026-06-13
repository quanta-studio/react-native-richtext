---
'@yk-yong/rn-rich-text-core': minor
'@yk-yong/rn-rich-text-css': patch
'@yk-yong/rn-rich-text': minor
---

List/quote/code polish: ordered lists render `a.`/`i.`/`A.`/`I.` markers (lower/upper alpha + roman) and
honor the `<ol start>`, `<ol type>`, and `<li value>` attributes; `blockquote` gets a left border; `pre`
scrolls horizontally so long lines no longer wrap or clip.

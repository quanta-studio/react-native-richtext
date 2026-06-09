# @yk-yong/rn-rich-text-dom

Forgiving HTML → DOM parsing and traversal for the `rn-rich-text` renderer.
React-free; built on `htmlparser2` / `domhandler` / `domutils`.

```ts
import { parse, getElementsByTagName, isTag } from '@yk-yong/rn-rich-text-dom'

const doc = parse('<p>Hello <b>world</b></p>')
const paragraphs = getElementsByTagName('p', doc)
```

Entities are left **raw** in the DOM (e.g. `&amp;` stays `&amp;`); decoding happens
later in the CSS/render layer.

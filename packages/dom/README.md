# @quanta-studio/react-native-richtext-dom

Forgiving HTML → DOM parsing and traversal for the `react-native-richtext` renderer.
React-free; built on `htmlparser2` / `domhandler` / `domutils`.

```ts
import { parse, getElementsByTagName, isTag } from '@quanta-studio/react-native-richtext-dom'

const doc = parse('<p>Hello <b>world</b></p>')
const paragraphs = getElementsByTagName('p', doc)
```

Entities are left **raw** in the DOM (e.g. `&amp;` stays `&amp;`); decoding happens
later in the CSS/render layer.

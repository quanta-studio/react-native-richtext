import { Anchor } from './Anchor'
import { ListItem } from './ListItem'
import { Rule } from './Rule'
import type { Renderer } from '../types'

/** Built-in tag specializations. Generic block/inline are NodeRenderer's fallback. */
export const defaultRenderers: Record<string, Renderer> = {
  a: Anchor,
  li: ListItem,
  hr: Rule,
}

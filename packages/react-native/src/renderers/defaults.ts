import { Anchor } from './Anchor'
import { ListItem } from './ListItem'
import { Rule } from './Rule'
import { Img } from './Img'
import { Pre } from './Pre'
import { Table } from './Table'
import { TableRow } from './TableRow'
import { TableCell } from './TableCell'
import { Heading } from './Heading'
import type { Renderer } from '../types'

/** Built-in tag specializations. Generic block/inline are NodeRenderer's fallback. */
export const defaultRenderers: Record<string, Renderer> = {
  a: Anchor,
  li: ListItem,
  hr: Rule,
  img: Img,
  pre: Pre,
  table: Table,
  tr: TableRow,
  td: TableCell,
  th: TableCell,
  h1: Heading,
  h2: Heading,
  h3: Heading,
  h4: Heading,
  h5: Heading,
  h6: Heading,
}

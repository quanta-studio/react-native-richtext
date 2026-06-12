import { parseDocument } from 'htmlparser2'
import type { Document } from 'domhandler'

export interface ParseOptions {
  /** Lower-case tag names (HTML semantics). Default `true`. */
  lowerCaseTags?: boolean
  /** Lower-case attribute names. Default `true`. */
  lowerCaseAttributeNames?: boolean
}

const DEFAULTS = {
  // Keep entities raw in the DOM; decoding happens in the css/render layer.
  decodeEntities: false,
  // HTML semantics: void elements, case-insensitive tags, optional closings.
  xmlMode: false,
  lowerCaseTags: true,
  lowerCaseAttributeNames: true,
  recognizeSelfClosing: true,
} as const

/** Parse an HTML string into a forgiving, queryable DOM `Document`. */
export function parse(html: string, options: ParseOptions = {}): Document {
  return parseDocument(html, { ...DEFAULTS, ...options })
}

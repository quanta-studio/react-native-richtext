import { decodeHTML } from 'entities'

/** Decode HTML entities (named + numeric) in raw text. */
export function decodeText(raw: string): string {
  return decodeHTML(raw)
}

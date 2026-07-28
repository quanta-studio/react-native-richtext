import type { Document, Element } from '@quanta-studio/react-native-richtext-dom'
import type { ComputedStyle } from '@quanta-studio/react-native-richtext-css'
import { splitDocument } from './split'
import { processText } from './text/process-text'
import { annotateMarkers } from './markers'
import type { BlockChild } from './types'

/** Build the renderer-agnostic styled tree from a parsed DOM + css computed styles. */
export function buildRenderTree(
  document: Document,
  styles: Map<Element, ComputedStyle>,
): BlockChild[] {
  return annotateMarkers(processText(splitDocument(document, styles)))
}

import type { Element } from '@yk-yong/rn-rich-text-dom'
import type { ComputedStyle } from '@yk-yong/rn-rich-text-css'

export type Display = ComputedStyle['control']['display']

const NON_RENDERED = new Set<string>([
  'head',
  'style',
  'script',
  'title',
  'meta',
  'link',
  'base',
  'noscript',
])

export function isNonRendered(tag: string): boolean {
  return NON_RENDERED.has(tag)
}

export function displayOf(el: Element, styles: Map<Element, ComputedStyle>): Display {
  return styles.get(el)?.control.display ?? 'inline'
}

export function isHidden(el: Element, styles: Map<Element, ComputedStyle>): boolean {
  return displayOf(el, styles) === 'none'
}

export function isBlockLevel(display: Display): boolean {
  return display === 'block' || display === 'list-item'
}

export function isInlineLevel(display: Display): boolean {
  return display !== 'none' && !isBlockLevel(display)
}

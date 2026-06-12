import type { DeferredLength } from '../types'

export interface FontContext {
  ownFontSize: number
  parentFontSize: number
  rootFontSize: number
}

/** Resolve a deferred relative length into an absolute number given the font-size context. */
export function resolveDeferred(d: DeferredLength, ctx: FontContext): number {
  switch (d.unit) {
    case 'rem':
      return d.number * ctx.rootFontSize
    case 'em':
      return d.number * (d.prop === 'fontSize' ? ctx.parentFontSize : ctx.ownFontSize)
    case '%':
      return (d.number / 100) * (d.prop === 'fontSize' ? ctx.parentFontSize : ctx.ownFontSize)
    case 'unitless':
      return d.number * ctx.ownFontSize
  }
}

import { isInherited } from '../inherit/inherited'
import { resolveDeferred } from '../units/resolve-deferred'
import type {
  ComputedStyle,
  ControlProp,
  ControlStyle,
  DeclValue,
  DeferredLength,
  RNStyle,
  TargetProp,
} from '../types'
import type { SpecifiedStyle } from '../cascade/cascade'

/** Synthetic parent for the document roots: CSS initial inherited values. */
export const ROOT_PARENT: ComputedStyle = {
  style: { color: '#000000', fontSize: 16 },
  control: { display: 'block', whiteSpace: 'normal' },
}

const CONTROL_PROPS = new Set<string>([
  'display',
  'whiteSpace',
  'listStyleType',
  'listStylePosition',
  'borderCollapse',
])
const isControl = (p: TargetProp): p is ControlProp => CONTROL_PROPS.has(p)
const isDeferred = (v: DeclValue): v is DeferredLength =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  (v as DeferredLength).kind === 'deferred-length'

/** Compute one element's style from its specified style and the parent's computed style. */
export function computeElement(
  specified: SpecifiedStyle,
  parent: ComputedStyle,
  rootFontSize: number,
): ComputedStyle {
  const style: RNStyle = {}
  const control: ControlStyle = { display: 'inline', whiteSpace: 'normal' }

  // 1. Seed inherited props from the parent.
  for (const prop of Object.keys(parent.style) as (keyof RNStyle)[]) {
    if (isInherited(prop)) (style as Record<string, unknown>)[prop] = parent.style[prop]
  }
  for (const prop of Object.keys(parent.control) as ControlProp[]) {
    if (isInherited(prop) && parent.control[prop] !== undefined) {
      ;(control as unknown as Record<string, unknown>)[prop] = parent.control[prop]
    }
  }

  const parentFontSize = parent.style.fontSize ?? rootFontSize

  // 2. Resolve fontSize first (em/% on font-size use the parent font-size).
  const fsEntry = specified.get('fontSize')
  let ownFontSize = style.fontSize ?? parentFontSize
  if (fsEntry) {
    const v = fsEntry.value
    ownFontSize = isDeferred(v)
      ? resolveDeferred(v, { ownFontSize: parentFontSize, parentFontSize, rootFontSize })
      : (v as number)
  }
  style.fontSize = ownFontSize

  // 3. Resolve everything else against the own font-size.
  const ctx = { ownFontSize, parentFontSize, rootFontSize }
  for (const [prop, entry] of specified) {
    if (prop === 'fontSize') continue
    const value = isDeferred(entry.value) ? resolveDeferred(entry.value, ctx) : entry.value
    if (isControl(prop)) (control as unknown as Record<string, unknown>)[prop] = value
    else (style as Record<string, unknown>)[prop] = value
  }

  return { style, control }
}

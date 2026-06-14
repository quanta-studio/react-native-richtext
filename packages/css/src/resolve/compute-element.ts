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

/**
 * text-decoration-line is not an inherited property, but a decoration drawn by an ancestor still
 * applies over descendant text. React Native honors only ONE textDecorationLine per Text (the
 * nearest ancestor wins; it does not union across nested <Text>), so we accumulate the union onto
 * each element — e.g. <u> nested in <strike> resolves to 'underline line-through'. A descendant's
 * own 'none' does not remove an ancestor's decoration (matching CSS).
 */
function combineDecoration(
  parent: RNStyle['textDecorationLine'],
  own: RNStyle['textDecorationLine'],
): RNStyle['textDecorationLine'] {
  const underline = Boolean(parent?.includes('underline')) || Boolean(own?.includes('underline'))
  const lineThrough =
    Boolean(parent?.includes('line-through')) || Boolean(own?.includes('line-through'))
  if (underline && lineThrough) return 'underline line-through'
  if (underline) return 'underline'
  if (lineThrough) return 'line-through'
  return undefined
}

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

  // 4. Accumulate text-decoration-line from the parent (union), so nested decorations combine.
  const decoration = combineDecoration(parent.style.textDecorationLine, style.textDecorationLine)
  if (decoration !== undefined) style.textDecorationLine = decoration
  else delete style.textDecorationLine

  return { style, control }
}

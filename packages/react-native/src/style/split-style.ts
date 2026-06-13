import type { RNStyle } from '@yk-yong/react-native-richtext-core'

const TEXT_PROPS = new Set<string>([
  'color',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'fontVariant',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textDecorationLine',
  'textDecorationColor',
  'textDecorationStyle',
  'textTransform',
])

/** Partition an RNStyle into text props (for <Text>) and the rest (for <View>). */
export function splitStyle(style: RNStyle): {
  view: Record<string, unknown>
  text: Record<string, unknown>
} {
  const view: Record<string, unknown> = {}
  const text: Record<string, unknown> = {}
  for (const [prop, value] of Object.entries(style)) {
    if (value === undefined) continue
    if (TEXT_PROPS.has(prop)) text[prop] = value
    else view[prop] = value
  }
  return { view, text }
}

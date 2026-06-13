/** Bijective base-26: 1->a, 26->z, 27->aa. Falls back to String(n) for n < 1. */
export function toAlpha(n: number, upper: boolean): string {
  if (n < 1) return String(n)
  let s = ''
  let x = n
  while (x > 0) {
    const rem = (x - 1) % 26
    s = String.fromCharCode(97 + rem) + s
    x = Math.floor((x - 1) / 26)
  }
  return upper ? s.toUpperCase() : s
}

const ROMAN: ReadonlyArray<readonly [number, string]> = [
  [1000, 'm'],
  [900, 'cm'],
  [500, 'd'],
  [400, 'cd'],
  [100, 'c'],
  [90, 'xc'],
  [50, 'l'],
  [40, 'xl'],
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
]

/** Subtractive roman numerals for 1..3999; falls back to String(n) outside that range. */
export function toRoman(n: number, upper: boolean): string {
  if (n < 1 || n > 3999) return String(n)
  let x = n
  let s = ''
  for (const [value, symbol] of ROMAN) {
    while (x >= value) {
      s += symbol
      x -= value
    }
  }
  return upper ? s.toUpperCase() : s
}

/** Map an HTML <ol type> attribute to a CSS list-style-type. */
export function mapTypeAttr(type: string | undefined): string | undefined {
  switch (type) {
    case 'a':
      return 'lower-alpha'
    case 'A':
      return 'upper-alpha'
    case 'i':
      return 'lower-roman'
    case 'I':
      return 'upper-roman'
    case '1':
      return 'decimal'
    default:
      return undefined
  }
}

/** Render an ordered-list marker string for a 1-based index + list-style-type. */
export function orderedMarker(index: number, listStyleType: string): string {
  switch (listStyleType) {
    case 'lower-alpha':
    case 'lower-latin':
      return `${toAlpha(index, false)}.`
    case 'upper-alpha':
    case 'upper-latin':
      return `${toAlpha(index, true)}.`
    case 'lower-roman':
      return `${toRoman(index, false)}.`
    case 'upper-roman':
      return `${toRoman(index, true)}.`
    default:
      return `${index}.`
  }
}

/** Convert a kebab-case CSS property name to camelCase (lower-casing first). */
export function camelCase(prop: string): string {
  return prop
    .toLowerCase()
    .replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase())
}

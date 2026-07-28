# Phase 1 (`@scope/css`) — deferred follow-ups

Phase 1's deliverable — a tested, React-free `@quanta-studio/react-native-richtext-css` package whose
`resolveStyles(document, options)` returns a fully-computed `Map<Element, ComputedStyle>` plus
optional diagnostics — is complete and green (lint + typecheck + tests + build). The items below
were surfaced by the final whole-implementation review. **None are blockers**; the engine is
correct on every core dimension (cascade, specificity, inheritance, `em`/`rem`/`%`/`pt`/unitless
resolution, `fontSize`-first ordering, structural selectors, `baseStyle` root-only, opt-in
diagnostics). They are recorded here so they are not lost.

## 1. `font` / `border` / `background` shorthands with non-px units can leak raw strings

The property whitelist (`src/mapping/whitelist.ts`) marks `font`, `border`, `border{Top,Right,
Bottom,Left}`, and `background` as `style` shorthands and hands them to `css-to-react-native`.
RN has no `font`/`border`/`background` shorthand property, and `css-to-react-native` is permissive:
for a value it cannot fully parse it returns the raw string. So e.g. `font: 1.2em serif` can yield
`{ font: '1.2em serif' }` — a string in a field RN does not understand — and the per-value
`unsupported-unit` guard added in `map-declaration.ts` only catches _single-token_ bare-unit values
(`50vw`), not multi-token shorthand strings.

This is rare in inline/CMS styles and does not crash. **Options when revisited:** drop
`font`/`border`/`background` shorthands from the whitelist (so they diagnose as `unknown-property`),
or expand them ourselves into RN longhands (as Task 6 does for `margin`/`padding`). Tracked for a
later sub-phase under the same "curated coverage" policy.

## 2. Unitless `line-height` inherits as a resolved absolute number, not the CSS factor

In CSS, a unitless `line-height` (e.g. `1.5`) inherits as the _factor_ and each descendant
recomputes `factor × its own font-size`. Our engine resolves the factor to an absolute number at
the element where it is specified (`units/resolve-deferred.ts` → `unitless`), then inheritance
propagates that absolute number. A descendant with a different `font-size` therefore keeps the
ancestor's absolute `lineHeight` instead of recomputing.

This is defensible for v1 (RN requires an absolute `lineHeight` number, and the value is never
broken — just not fully CSS-conformant for the differing-font-size case). **When revisited:** carry
the unitless factor through inheritance and resolve per-descendant. Add a code comment at the
`unitless` site noting this until then.

## 3. `@types/css-tree` major-version mismatch (do NOT remove the dep)

`css-tree@3.2.1` ships **no** bundled TypeScript types, so `@types/css-tree` is **load-bearing** —
removing it makes `parse-stylesheet.ts`, `parse-inline.ts`, and `specificity.ts` implicit-`any` and
breaks typecheck. The only nit is that the installed `@types/css-tree@^2` types a `css-tree@3`
runtime; it works because the AST node shapes used here (`Rule`, `Declaration`, `SelectorList`,
`IdSelector`/`ClassSelector`/`TypeSelector`/`AttributeSelector`/`PseudoClassSelector`/
`PseudoElementSelector`, `Block`) are stable across v2→v3. **When revisited:** move to a v3-aligned
typings source (or pin) if the v3 AST diverges. Until then, leave the dependency in place.

## 4. Best-effort diagnostics

`unsupported-value`/`unsupported-unit` diagnostics are best-effort: because `css-to-react-native`
passes many unparseable values through as strings rather than throwing, only values our explicit
guards recognise (`calc(`, the single-token viewport/absolute-unit pattern) are reported. This
matches the spec ("skip + optional diagnostics", opt-in via `collectDiagnostics`); broadening
coverage is a future enhancement, not a correctness blocker.

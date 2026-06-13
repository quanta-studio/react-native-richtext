# react-native-richtext — Phase 1: `@scope/css` Engine Design

Date: 2026-06-12
Status: Draft for review
Depends on: Phase 0 (`@yk-yong/react-native-richtext-dom`, merged) and
`docs/specs/2026-06-09-architecture-and-phase-0-design.md` (read that first).

## What this is

Phase 1 builds **`@scope/css`** (`@yk-yong/react-native-richtext-css`): the CSS engine that turns a
parsed DOM plus consumer-supplied styles into a **fully-resolved RN style per element node**.
It is React-free pure logic — the package where the edge cases live, so it gets exhaustive unit
tests (per the project conventions). No rendering happens here; that is Phase 2 (`@scope/core` +
`@scope/react-native`).

The pipeline stages this package owns are stages [2] Collect CSS and [3] Resolve/cascade from
the architecture doc:

```
DOM ─▶ [2] Collect CSS  parse <style> blocks + inline style attrs; merge with consumer
                        baseStyle/tagStyles/classStyles + a built-in UA stylesheet
    ─▶ [3] Resolve      per node: match selectors, order by cascade tier + specificity,
       (cascade)        apply inheritance, resolve relative units, map declarations → RN style
                        ⇒ Map<Element, ComputedStyle>
```

## Decisions locked during brainstorming (do not re-litigate)

| Question            | Decision                                                                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 coverage    | **Machinery-complete, curated coverage**: full cascade/specificity/inheritance/relative-unit engine with exhaustive tests; UA stylesheet + property whitelist curated to the v1 tag set; the long tail of properties expands iteratively. |
| Output contract     | **Eager computed-style map**: `resolveStyles(document, options) → { styles: Map<Element, ComputedStyle>, diagnostics }`, computed in a single top-down pass.                                                                              |
| Unsupported CSS     | **Skip + optional diagnostics**: never throw on bad CSS; drop the declaration; collect a structured diagnostics list only when `collectDiagnostics` is set (off by default).                                                              |
| Resolution strategy | **Approach B — match → cascade → compute as separate stages.** Stages 1–3 are pure/stateless and table-testable; only the compute pass needs tree order.                                                                                  |

## Package

- Name: `@yk-yong/react-native-richtext-css`. React-free. Depends on the `@yk-yong/react-native-richtext-dom`
  workspace package.
- Build/test/tsconfig mirror `packages/dom` exactly: tsup build, Vitest tests, TS project
  references, same `moduleResolution: Bundler` baseline (the Phase 0 publish follow-ups in
  `docs/phase-0-followups.md` apply repo-wide and are addressed there, not here — in-repo
  consumers resolve fine under Bundler resolution).
- New direct dependencies:
  - `css-tree` — parse stylesheets, inline declarations, and selector ASTs.
  - `css-select` — match selectors against the domhandler DOM (works directly on domhandler
    nodes; no adapter needed).
  - `css-to-react-native` — shorthand expansion + declaration value parsing.
  - `@csstools/selector-specificity` — specificity from the selector AST (or hand-rolled from
    the css-tree selector AST if it proves simpler; decided in planning).

## Module decomposition

Each module has one concern and is independently testable — this is the reason for Approach B.

```
src/
  parse/        css-tree wrappers: parseStylesheet(css) → Rule[], parseInline(attr) → RNDecl[]
  specificity/  selector AST → specificity tuple (a, b, c)
  match/        css-select adapter: element × rules → matched rules
  mapping/      declaration → RN longhand props (shorthand expand, value parse, diagnostics)
  ua/           the curated user-agent stylesheet (v1 tag set)
  cascade/      matched declarations → specified style (winner per property)
  inherit/      the inherited-property set + inheritance application
  units/        relative-unit resolution (em/rem/%/pt/unitless line-height → number | string)
  resolve/      orchestrator: resolveStyles(document, options)
  options.ts    ResolveOptions
  types.ts      RNStyle, RNDecl, Rule, Tier, ComputedStyle, Diagnostic, …
  index.ts      public barrel (resolveStyles + public types)
```

## Data model

- **`RNDecl`** — a single mapped declaration: `{ prop: keyof RNStyle, value: ResolvedValue | DeferredLength }`.
  CSS-text declarations are **shorthand-expanded and mapped to RN longhand props at collection
  time**, so the cascade competes at longhand granularity (a later `margin-top` correctly beats
  part of an earlier `margin` shorthand — how browsers actually cascade). Consumer RN objects
  (`tagStyles`, `classStyles`, `baseStyle`) are already longhand RN form and enter the same way.
- **`Rule`** — `{ origin: Tier, selectorText?: string, specificity: Specificity, order: number,
important: boolean, declarations: RNDecl[] }`.
- **`SpecifiedStyle`** — the cascade winner per property for one element. May still hold
  `DeferredLength` tokens and have gaps for inherited properties not set on this element.
- **`ComputedStyle`** — the per-node map value:
  ```ts
  interface ComputedStyle {
    style: RNStyle                       // pure RN style object (final values)
    control: {
      display: 'block' | 'inline' | 'inline-block' | 'list-item' | 'none' | …
      whiteSpace: 'normal' | 'pre' | 'pre-wrap' | 'nowrap' | …
      listStyleType?: string
      listStylePosition?: 'inside' | 'outside'
    }
  }
  ```
  The **`control` block is deliberate**: the renderer's block/inline split is "driven by computed
  `display`," and `white-space` / `list-style` are computed CSS that are not RN style keys. Keeping
  them in a typed `control` object keeps `style` a pure RN style object while still handing Stage 4
  (Phase 2) exactly what it needs. The `control` set is extensible as later phases need more.

## Cascade tiers

The architecture's `UA < tag < class < <style> < inline`, with `baseStyle` inserted as a
root-only tier just above UA. Precedence low → high:

| #   | Tier              | Source                                                        | Ordering within tier               |
| --- | ----------------- | ------------------------------------------------------------- | ---------------------------------- |
| 0   | UA                | built-in stylesheet                                           | specificity + source order         |
| 1   | `baseStyle`       | consumer; **applies to the root element only**, inherits down | —                                  |
| 2   | `tagStyles`       | consumer; keyed by tag name                                   | —                                  |
| 3   | `classStyles`     | consumer; keyed by class name                                 | —                                  |
| 4   | `<style>` blocks  | author CSS in the document                                    | **specificity, then source order** |
| 5   | inline `style=""` | author, per-element                                           | —                                  |

Each element's matched declarations are sorted by `(important, tier, specificity, order)` and the
highest wins per property.

- **`baseStyle`** is the consumer's base text style: a root-only tier above UA that propagates via
  normal inheritance, overridable by anything more specific (the `react-native-render-html` mental
  model).
- **`tagStyles` / `classStyles`** are keyed by bare tag/class name (matching the public API
  `tagStyles={{ p: {…} }}`, `classStyles={{ note: {…} }}`), not full selectors. Complex selectors
  come from `<style>` blocks.
- **Selectors supported**: full combinators (`>`, `+`, `~`, descendant), attribute selectors, and
  _structural_ pseudo-classes (`:first-child`, `:nth-child`, `:last-child`) — all free from
  css-select and common in CMS CSS. **Excluded**: interactive/state pseudo-classes (`:hover`,
  `:focus`) and pseudo-elements (`::before`) — already out of scope for v1.
- **`!important`** is supported as a cascade modifier (author-important beats author-normal); it is
  part of cascade correctness, not coverage. The UA-`!important` corner is deferred.

## Inheritance

The compute pass fills any _unspecified_ inherited property from the parent's computed value.

Curated **inherited-property set** (CSS-inherited props relevant to RN/v1):
`color`, `fontFamily`, `fontSize`, `fontStyle`, `fontWeight`, `fontVariant`, `lineHeight`,
`letterSpacing`, `textAlign`, `textTransform`, `whiteSpace`, `listStyleType`, `listStylePosition`.

Everything else (margins, padding, borders, background, width/height, `display`, opacity, …) is
**non-inherited**. The document root seeds its inherited context from
`UA-inherited-defaults ⊕ baseStyle` (baseStyle wins).

## Relative-unit resolution

Resolved in the top-down compute pass against the font-size context.

- **`rootFontSize`** = `baseStyle.fontSize ?? options.rootFontSize ?? 16`. `rem` resolves against
  this.
- **`em`** → the parent's computed font-size for the `font-size` property itself; the element's own
  computed font-size for every other property (standard CSS).
- **`%`** → resolved to a number only for `font-size` (relative to parent font-size) and
  `line-height` (relative to own font-size). On layout props (`width`/`height`/`margin`/`padding`/…)
  percentages **pass through as RN strings** (`'50%'`) — Yoga handles them natively.
- **unitless `line-height`** (e.g. `1.5`) → `1.5 × computed fontSize` (RN needs an absolute
  `lineHeight` number).
- **`pt`** → px (`× 96 / 72`); **`px`** / bare number → number.
- **Viewport units** (`vw`/`vh`) → dropped + diagnostic (no static RN equivalent in Phase 1).

Mechanically: `mapping/` parses context-free values (px, numbers, colors, keywords) immediately and
carries context-dependent lengths (`em`/`rem`/`%`, unitless `line-height`) as **`DeferredLength`
tokens**; `units/` finalizes them in the compute pass. This split is exactly why `mapping` and
`compute`/`units` are separate modules.

## Declaration → RN mapping & diagnostics

- `mapping/` wraps `css-to-react-native` for shorthand expansion and value parsing, gated by a
  **Fabric-tuned property whitelist** curated to the v1 tag set: text props (`color`, `font-*`,
  `line-height`, `letter-spacing`, `text-align`, `text-decoration*`, `text-transform`), box props
  (`margin*`, `padding*`, `border*` incl. radius, `width`/`height`/`min`/`max`, `display`,
  `opacity`, `background-color`), and Fabric-widened props where supported (`gap`, `aspect-ratio`,
  `box-shadow`, …). The long tail is added iteratively under the same whitelist.
- A declaration that is an unknown property, an unsupported value, an unsupported unit, or a parse
  failure is **skipped — never thrown**.
- `Diagnostic = { property: string, value: string, reason: 'unknown-property' | 'unsupported-value'
| 'unsupported-unit' | 'parse-error', selector?: string, tier: Tier }`. Diagnostics are collected
  only when `options.collectDiagnostics` is true.

## Public API

```ts
import type { Document, Element } from '@yk-yong/react-native-richtext-dom'

function resolveStyles(
  document: Document,
  options?: ResolveOptions,
): { styles: Map<Element, ComputedStyle>; diagnostics: Diagnostic[] }

interface ResolveOptions {
  baseStyle?: RNStyle
  tagStyles?: Record<string, RNStyle>
  classStyles?: Record<string, RNStyle>
  rootFontSize?: number // default 16
  collectDiagnostics?: boolean // default false → diagnostics: []
  // <style> blocks are discovered in the DOM and parsed internally; no separate prop.
}
```

`diagnostics` is always present (empty `[]` when collection is off) so the return type is stable.
`RNStyle` is a typed subset of React Native's `TextStyle & ViewStyle` (RN _types_ only — no React
import), curated to the whitelist.

## Testing strategy (TDD — Red → Green → Refactor)

Exhaustive unit tests per module:

- **specificity** — tuple computation across selector shapes (id/class/type/attribute/pseudo,
  combinators).
- **cascade** — tier precedence, specificity ordering, source order, `!important`.
- **inherit** — the inherited set; inheritance fill across nesting; root seeding from `baseStyle`.
- **units** — every `em` / `rem` / `%` / `pt` / unitless-`line-height` case, font-size context,
  percentage pass-through vs resolution.
- **mapping** — shorthand expansion, value parsing, whitelist gating, diagnostics for each `reason`.
- **ua** — the user-agent stylesheet defaults for the v1 tag set.
- **match** — combinators, attribute selectors, structural pseudo-classes.

Plus a **fixtures corpus** of real-world HTML+CSS (incl. CMS/Wikipedia-style markup) run end-to-end
through `resolveStyles` and asserted against expected computed maps. No snapshots.

## Out of scope for Phase 1

`@media` / `@supports`, CSS custom properties (`var()`), `calc()`, pseudo-elements, interactive
pseudo-classes, animations/transitions, viewport units, the UA-`!important` corner, and the long
tail of rarely-used properties (added iteratively). **Per-font-file resolution** (the Montserrat
insight) stays in `@scope/react-native` (Phase 2) — Phase 1 only computes
`fontFamily`/`fontWeight`/`fontStyle` as values.

## Deliverable

A tested, React-free `@yk-yong/react-native-richtext-css` package exposing `resolveStyles(document, options)`
that returns a fully-computed `Map<Element, ComputedStyle>` (cascade + inheritance applied, relative
units resolved) plus optional diagnostics — with green CI (lint + typecheck + tests). No rendering.

## Open questions (resolve during planning)

- `@csstools/selector-specificity` vs hand-rolling specificity from the css-tree selector AST.
- Exact shape of the `RNStyle` type (hand-authored curated subset vs deriving from
  `@types/react-native`) while staying React-free and `any`-free.
- Final contents of the curated UA stylesheet (per-tag defaults) and the initial property
  whitelist — enumerated in the implementation plan.
- Whether `mapping/` calls `css-to-react-native` per-declaration or batches per rule (perf vs
  diagnostic granularity).

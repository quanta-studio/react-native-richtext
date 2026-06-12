import { getStylesForProperty } from 'css-to-react-native'
import { camelCase } from '../util/camel-case'
import { classifyProp } from './whitelist'
import { expandDeferred } from './expand-deferred'
import type { RawDecl } from '../parse/parse-stylesheet'
import type { Diagnostic, RNDecl, TargetProp } from '../types'

export type MapDiagnostic = Omit<Diagnostic, 'tier' | 'selector'>

export interface MapResult {
  decls: RNDecl[]
  diagnostics: MapDiagnostic[]
}

const RELATIVE_UNIT = /(?:^|\s)-?\d*\.?\d+(?:em|rem|%|pt)(?![a-z])/i

/** Bare number + a unit RN cannot use; % and px are excluded (valid for layout / already numeric). */
const UNSUPPORTED_UNIT = /^-?\d*\.?\d+(?:vw|vh|vmin|vmax|cm|mm|in|pc|ex|ch|q|pt)$/i

/** Values that RN cannot interpret: CSS functions not supported by css-to-react-native. */
const UNSUPPORTED_VALUE = /\bcalc\s*\(/i

/** Matches a bare unitless number, e.g. "1.5" or "-2" (for unitless line-height). */
const UNITLESS_NUMBER = /^-?\d*\.?\d+$/

const NO_DIAGNOSTICS: MapDiagnostic[] = []

function failDecl(decl: RawDecl, reason: MapDiagnostic['reason']): MapResult {
  return { decls: [], diagnostics: [{ property: decl.property, value: decl.value, reason }] }
}

function looksRelative(camelProp: string, value: string): boolean {
  if (RELATIVE_UNIT.test(value)) return true
  // unitless line-height (e.g. "1.5") must be multiplied by font-size
  return camelProp === 'lineHeight' && UNITLESS_NUMBER.test(value.trim())
}

/** Map one raw declaration into RN longhand decls, collecting any diagnostic. */
export function mapDeclaration(decl: RawDecl): MapResult {
  const camel = camelCase(decl.property)
  const kind = classifyProp(camel)

  if (kind === 'unsupported') {
    return failDecl(decl, 'unknown-property')
  }

  if (kind === 'control') {
    return {
      decls: [{ prop: camel as TargetProp, value: decl.value, important: decl.important }],
      diagnostics: NO_DIAGNOSTICS,
    }
  }

  // style prop — check for unsupported CSS functions before any parsing
  if (UNSUPPORTED_VALUE.test(decl.value)) {
    return failDecl(decl, 'unsupported-value')
  }

  if (looksRelative(camel, decl.value)) {
    const expanded = expandDeferred(camel, decl.value)
    return {
      decls: expanded.map((e) => ({ prop: e.prop, value: e.value, important: decl.important })),
      diagnostics: NO_DIAGNOSTICS,
    }
  }

  try {
    const rn = getStylesForProperty(camel, decl.value)
    const decls: RNDecl[] = []
    let droppedUnit = false
    for (const [prop, value] of Object.entries(rn)) {
      if (typeof value === 'string' && UNSUPPORTED_UNIT.test(value.trim())) {
        droppedUnit = true
        continue
      }
      decls.push({
        prop: prop as TargetProp,
        value: value as RNDecl['value'],
        important: decl.important,
      })
    }
    if (droppedUnit && decls.length === 0) {
      return {
        decls: [],
        diagnostics: [{ property: decl.property, value: decl.value, reason: 'unsupported-unit' }],
      }
    }
    return {
      decls,
      diagnostics: droppedUnit
        ? [{ property: decl.property, value: decl.value, reason: 'unsupported-unit' }]
        : NO_DIAGNOSTICS,
    }
  } catch {
    return failDecl(decl, 'unsupported-value')
  }
}

import { getStylesForProperty } from 'css-to-react-native'
import { camelCase } from '../util/camel-case'
import { classifyProp } from './whitelist'
import { expandDeferred } from './expand-deferred'
import type { RawDecl } from '../parse/parse-stylesheet'
import type { DiagnosticReason, RNDecl, TargetProp } from '../types'

export interface MapDiagnostic {
  property: string
  value: string
  reason: DiagnosticReason
}

export interface MapResult {
  decls: RNDecl[]
  diagnostics: MapDiagnostic[]
}

const RELATIVE_UNIT = /(?:^|\s)-?\d*\.?\d+(?:em|rem|%)\b/i

/** Values that RN cannot interpret: CSS functions not supported by css-to-react-native. */
const UNSUPPORTED_VALUE = /\bcalc\s*\(/i

function looksRelative(camelProp: string, value: string): boolean {
  if (RELATIVE_UNIT.test(value)) return true
  // unitless line-height (e.g. "1.5") must be multiplied by font-size
  if (camelProp === 'lineHeight' && /^-?\d*\.?\d+$/.test(value.trim())) return true
  return false
}

/** Map one raw declaration into RN longhand decls, collecting any diagnostic. */
export function mapDeclaration(decl: RawDecl): MapResult {
  const camel = camelCase(decl.property)
  const kind = classifyProp(camel)

  if (kind === 'unsupported') {
    return { decls: [], diagnostics: [{ property: decl.property, value: decl.value, reason: 'unknown-property' }] }
  }

  if (kind === 'control') {
    return {
      decls: [{ prop: camel as TargetProp, value: decl.value, important: decl.important }],
      diagnostics: [],
    }
  }

  // style prop — check for unsupported CSS functions before any parsing
  if (UNSUPPORTED_VALUE.test(decl.value)) {
    return { decls: [], diagnostics: [{ property: decl.property, value: decl.value, reason: 'unsupported-value' }] }
  }

  if (looksRelative(camel, decl.value)) {
    const expanded = expandDeferred(camel, decl.value)
    return {
      decls: expanded.map((e) => ({ prop: e.prop, value: e.value, important: decl.important })),
      diagnostics: [],
    }
  }

  try {
    const rn = getStylesForProperty(camel, decl.value)
    const decls: RNDecl[] = Object.entries(rn).map(([prop, value]) => ({
      prop: prop as TargetProp,
      value: value as RNDecl['value'],
      important: decl.important,
    }))
    return { decls, diagnostics: [] }
  } catch {
    return { decls: [], diagnostics: [{ property: decl.property, value: decl.value, reason: 'unsupported-value' }] }
  }
}

import ObjectUtils from './ObjectUtils.js'
import { Parser } from './vendor/expr-eval/expr-eval.js'

export function analyzeExpression({ path, defaultExpr = '' }) {
  try {
    const text = ObjectUtils.try(...path) || defaultExpr
    const expr = Parser.parse(text)
    return { variables: expr.variables() }
  } catch (e) {
    return { error: true }
  }
}

export function analyzeDamageFormula({ path, defaultExpr = '' }) {
  const text = ObjectUtils.try(...path) || defaultExpr
  return { error: !text.match(/^\s*\d+\s*(\+\s*\d+d\d+(\/\d+)?\s*)?$/g) }
}

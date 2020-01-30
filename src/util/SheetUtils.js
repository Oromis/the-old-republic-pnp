import ObjectUtils from './ObjectUtils.js'
import { Parser } from '../vendor/expr-eval/expr-eval.js'

export function analyzeExpression({ expression, path = [], defaultExpr = '' }) {
  const text = expression || ObjectUtils.try(...path) || defaultExpr
  const result = { formula: text, formulaError: false, variables: [] }
  try {
    const expr = Parser.parse(text)
    result.variables = expr.variables()
  } catch (e) {
    result.formulaError = true
  }
  return result
}

export function analyzeDamageFormula({ expression, path, defaultExpr = '' }) {
  const text = expression != null ? expression : (ObjectUtils.try(...path) || defaultExpr)
  return { formulaError: !text.match(/^\s*\d+\s*(\+\s*\d+[wd]\d+(\/\d+)?\s*)?$/g) }
}

export function onDragOver() {
  return event => {
    event.preventDefault()
    return false
  }
}

export function onDropItem(callback) {
  return event => {
    event.preventDefault()

    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if ( data.type !== "Item" ) {
        return
      }
    } catch (err) {
      return false;
    }

    // Case 1 - Import from a Compendium pack
    if ( data.pack ) {
      let pack = game.packs.find(p => p.collection === data.pack)
      pack.getEntry(data.id).then(e => {
        callback(e.type, e)
      })
    }

    // Case 2 - Data explicitly provided
    else if ( data.data ) {
      callback(data.data.type, data.data)
    }

    // Case 3 - Import from World entity
    else {
      let item = game.items.get(data.id);
      if ( !item ) return;
      callback(item.data.type, item.data)
    }
    return false;
  }
}

export function itemNameComparator(a, b) {
  return a.name.localeCompare(b.name)
}

export function processDeltaValue(text, oldValue) {
  const matches = /\s*([+\-*/])\s*([+\-]?[\d.]+)/.exec(text)
  if (matches) {
    switch (matches[1]) {
      case '+':
        return (+oldValue) + (+matches[2])
      case '-':
        return (+oldValue) - (+matches[2])
      case '*':
        return (+oldValue) * (+matches[2])
      case '/':
        return (+oldValue) / (+matches[2])
    }
  }

  if (!isNaN(text)) {
    // Input is just a number => use it directly
    return +text
  }

  // If we get here then the format is invalid
  ui.notifications.error(`Ungültiger Wert: ${text}. Formate: <Number>, +<Number>, -<Number>, *<Number>, /<Number>`)
  return oldValue
}

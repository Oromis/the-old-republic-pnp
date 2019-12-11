import ObjectUtils from './ObjectUtils.js'
import { Parser } from './vendor/expr-eval/expr-eval.js'
import {detectPropertyType} from './CharacterFormulas.js'
import Skills from './Skills.js'
import Attributes from './Attributes.js'
import Metrics from './Metrics.js'

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
  return { error: !text.match(/^\s*\d+\s*(\+\s*\d+[wd]\d+(\/\d+)?\s*)?$/g) }
}

export function resolveModLabel(key, { defaultLabel = key } = {}) {
  let type = ''
  try {
    type = detectPropertyType({key})
  } catch(e) {}
  if(type === 'skill') {
    return ObjectUtils.try(Skills.getMap()[key.toLowerCase()], 'label', { default: defaultLabel })
  } else if(type === 'attribute') {
    return ObjectUtils.try(Attributes.map[key.toLowerCase()], 'label', { default: defaultLabel })
  } else if(type === 'metric') {
    return ObjectUtils.try(Metrics.map[key], 'label', { default: defaultLabel })
  }
  return defaultLabel
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

export function makeRoll(data) {
  if (data.target == null && typeof data.value === 'number') {
    data.target = Math.floor(data.value / 5)
  }
  return data
}

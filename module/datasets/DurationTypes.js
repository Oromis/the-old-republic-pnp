import ObjectUtils from '../util/ObjectUtils.js'
import PropertyPrototype from '../properties/PropertyPrototype.js'
import Config from '../Config.js'
import { explainEffect, explainPropertyValue } from '../CharacterFormulas.js'
import { analyzeExpression } from '../util/SheetUtils.js'

class DurationTypePrototype extends PropertyPrototype {
  constructor(key, staticData) {
    super(key, { staticData })
  }
}

const list = [
  new DurationTypePrototype('instant', { label: 'Sofort', hasOneTimeCost: true }),
  new DurationTypePrototype('toggle', { label: 'Aktivierbar', hasOneTimeCost: true, hasPerTurnCost: true }),
  new DurationTypePrototype('channeling', { label: 'Anhaltend', hasPerTurnCost: true }),
  new DurationTypePrototype('rounds', { label: 'Runden', hasFormula: true, hasOneTimeCost: true }),
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
  default: 'instant',
})

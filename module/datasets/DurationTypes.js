import ObjectUtils from '../util/ObjectUtils.js'
import PropertyPrototype from '../properties/PropertyPrototype.js'
import Config from '../Config.js'
import { explainEffect, explainPropertyValue } from '../CharacterFormulas.js'
import { analyzeExpression } from '../util/SheetUtils.js'
import Property from '../properties/Property.js'
import { evalSkillExpression } from '../util/EntityUtils.js'
import DataCache from '../util/DataCache.js'

class DurationType extends Property {
  constructor(...args) {
    super(...args)

    this._cache = new DataCache()
  }

  get _expressionData() {
    return this._cache.lookup('expressionData', () => evalSkillExpression(this.formula, this._entity, { round: 0 }))
  }

  get value() {
    return this._expressionData.value
  }

  get variables() {
    return this._expressionData.variables
  }

  get formulaError() {
    return this._expressionData.formulaError
  }

  get evalError() {
    return this._expressionData.evalError
  }

  get formatted() {
    if (this.hasFormula) {
      return `${this.value} ${this.label}`
    } else {
      return this.label
    }
  }
}

class DurationTypePrototype extends PropertyPrototype {
  constructor(key, staticData) {
    super(key, { staticData, PropertyClass: DurationType })
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

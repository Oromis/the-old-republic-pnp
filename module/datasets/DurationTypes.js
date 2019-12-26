import ObjectUtils from '../ObjectUtils.js'
import PropertyPrototype from '../properties/PropertyPrototype.js'
import Config from '../Config.js'
import { explainEffect, explainPropertyValue } from '../CharacterFormulas.js'
import { analyzeExpression } from '../SheetUtils.js'

class DurationTypePrototype extends PropertyPrototype {
  constructor(key, staticData) {
    super(key, {
      staticData,
      updaters: [
        (data, { property }) => {
          if (property.hasFormula) {
            console.log(`Updating duration formula: ${data.formula}`)
            Object.assign(data, analyzeExpression({ expression: data.formula }))
          }
        }
      ],
    })
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

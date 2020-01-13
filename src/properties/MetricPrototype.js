import PropertyPrototype from './PropertyPrototype.js'
import { explainPropertyValue } from '../CharacterFormulas.js'
import Metric from './Metric.js'

export default class MetricPrototype extends PropertyPrototype {
  constructor(key, { staticData, template, PropertyClass = Metric }) {
    super(key, {
      staticData,
      template,
      updaters: [
        (data, { entity, property }) => {
          data.mod = entity.modifiers[property.key].explainBonus()
          const maxExplanation = property.maxExplanation
          data.max = maxExplanation.total
          data.maxComponents = maxExplanation.components
          data.missing = data.max - data.value
        }
      ],
      PropertyClass,
    })
  }
}

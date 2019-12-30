import PropertyPrototype from './PropertyPrototype.js'
import { explainEffect, explainPropertyValue } from '../CharacterFormulas.js'
import Metric from './Metric.js'

export default class MetricPrototype extends PropertyPrototype {
  constructor(key, { staticData, template, PropertyClass = Metric }) {
    super(key, {
      staticData,
      template,
      updaters: [
        (data, { entity, property }) => {
          data.mod = explainEffect(entity, property)
          const maxExplanation = explainPropertyValue(entity, property, { target: 'max' })
          data.max = maxExplanation.total
          data.maxComponents = maxExplanation.components
          data.missing = data.max - data.value
        }
      ],
      PropertyClass,
    })
  }
}

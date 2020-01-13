import PropertyPrototype from './PropertyPrototype.js'
import {explainPermanentPropertyValue, explainPropertyValue} from '../CharacterFormulas.js'
import Property from './Property.js'

export default class AttributePrototype extends PropertyPrototype {
  constructor(key, { staticData, template, PropertyClass = Property }) {
    super(key, {
      staticData,
      template,
      updaters: [
        (data, { entity, property }) => {
          data.mod = entity.modifiers[property.key].explainBonus()
          data.value = explainPropertyValue(entity, property)
        }
      ],
      PropertyClass
    })
  }
}

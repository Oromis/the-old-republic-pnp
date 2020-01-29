import ObjectUtils from '../util/ObjectUtils.js'
import AttributePrototype from '../properties/AttributePrototype.js'
import Attribute from './Attribute.js'

class BeastAttributePrototype extends AttributePrototype {
  constructor(key, staticData) {
    super(key, {
      staticData,
      PropertyClass: Attribute,
    })
  }
}

const list = [
  new BeastAttributePrototype('ch', {
    label: 'Charisma',
    encumberanceFactor: 2,
  }),
  new BeastAttributePrototype('ge', {
    label: 'Geschicklichkeit',
    encumberanceFactor: 15,
  }),
  new BeastAttributePrototype('in', {
    label: 'Intuition',
    encumberanceFactor: 2,
  }),
  new BeastAttributePrototype('kk', {
    label: 'Körperkraft',
    encumberanceFactor: 8,
  }),
  new BeastAttributePrototype('kl', {
    label: 'Klugheit',
    encumberanceFactor: 1.75,
  }),
  new BeastAttributePrototype('ko', {
    label: 'Konstitution',
    encumberanceFactor: 8,
  }),
  new BeastAttributePrototype('sc', {
    label: 'Schnelligkeit',
    encumberanceFactor: 15,
  }),
  new BeastAttributePrototype('wk', {
    label: 'Willenskraft',
    encumberanceFactor: 5,
  })
]

export default Object.freeze({ list, map: ObjectUtils.asObject(list, 'key') })

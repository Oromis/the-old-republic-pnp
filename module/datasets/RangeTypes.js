import ObjectUtils from '../util/ObjectUtils.js'
import PropertyPrototype from '../properties/PropertyPrototype.js'
import Property from '../properties/Property.js'

class RangeType extends Property {
  get formatted() {
    return this.format(this)
  }
}

class RangeTypePrototype extends PropertyPrototype {
  constructor(key, staticData) {
    super(key, { staticData, PropertyClass: RangeType })
  }
}

const list = [
  new RangeTypePrototype('self', { label: 'Selbst', format: () => 'Selbst' }),
  new RangeTypePrototype('touch', { label: 'Berührung', format: () => 'Berührung' }),
  new RangeTypePrototype('m', { label: 'Meter', format: range => `${range.number}m`, isNumeric: true }),
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

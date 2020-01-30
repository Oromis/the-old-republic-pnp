import PropertyPrototype from '../properties/PropertyPrototype.js'

export class SlotPrototype extends PropertyPrototype {
  explainCoordination() {
    return { total: 0, components: [] }
  }
}

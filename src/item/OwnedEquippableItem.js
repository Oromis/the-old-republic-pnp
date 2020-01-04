import { defineGetter } from '../util/EntityUtils.js'

export default {
  beforeConstruct() {
    defineGetter(this, 'equippedSlots', function () {
      return this._cache.lookup('equippedSlots', () => (
        this.actor.dataSet.slots.list.filter(slot => (this.slots || []).indexOf(slot.key) !== -1)
      ))
    })

    defineGetter(this, 'primaryEquippedSlot', function () {
      return this.equippedSlots[0]
    })

    defineGetter(this, 'equippedSlotNames', function () {
      return this.equippedSlots.map(slot => slot.label)
    })
  }
}

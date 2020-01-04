import { defineDataAccessor, defineGetter } from '../util/EntityUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'slots')
    defineDataAccessor(this, 'slotTypes')

    defineGetter(this, 'isEquipped', function () {
      return Array.isArray(this.slots) && this.slots.length > 0
    })

    this.isEquippedInSlot = function isEquippedInSlot(key) {
      const slots = this.slots || []
      return slots.some(slot => slot === key)
    }

    this.equip = function equip(slots) {
      return this.update({ 'data.slots': slots })
    }

    this.unequip = function unequip() {
      return this.update({ 'data.slots': [] })
    }
  }
}

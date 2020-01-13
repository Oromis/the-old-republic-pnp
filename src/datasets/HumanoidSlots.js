import ObjectUtils from '../util/ObjectUtils.js'
import PropertyPrototype from '../properties/PropertyPrototype.js'

class HumanoidSlotPrototype extends PropertyPrototype {
  constructor(key, staticData) {
    super(key, { staticData })
  }

  explainCoordination(actor) {
    if (!this.supportsWeapon) {
      throw new Error('Coordination is only available to weapon slots')
    }

    let result = {
      total: 0,
      components: []
    }
    const base = this.coordination || 0
    if (base !== 0) {
      result.total = base
      result.components.push({ label: 'Basis', value: base })
    }

    const item = actor.getItemInSlot(this.key)
    if (item != null) {
      const theOtherSlot = list.find(slot => slot.supportsWeapon && slot !== this)
      const otherSlotItem = actor.getItemInSlot(theOtherSlot.key)
      if (otherSlotItem == null) {
        // We can use both hands to wield a one-hand weapon => advantage
        const bonus = this.singleWieldBonus || 0
        if (bonus !== 0) {
          result.total += bonus
          result.components.push({ label: 'Einhändige Waffe zweihändig geführt', value: bonus })
        }
      } else if (otherSlotItem !== item) {
        // We use two different weapons in our slots => disadvantage
        const penalty = this.dualWieldPenalty || 0
        if (penalty !== 0) {
          result.total -= penalty
          result.components.push({ label: 'Beidhändiger Kampf', value: -penalty })
        }
      }
    }
    return result
  }
}

const list = [
  new HumanoidSlotPrototype('head', { label: 'Kopf', type: 'head', img: 'systems/sw-tor/icons/slots/ihead.webp' }),
  new HumanoidSlotPrototype('implant', { label: 'Implantat', type: 'implant', img: 'systems/sw-tor/icons/slots/iimplant.webp' }),
  new HumanoidSlotPrototype('torso', { label: 'Oberkörper', type: 'torso', img: 'systems/sw-tor/icons/slots/iarmor.webp' }),
  new HumanoidSlotPrototype('right-arm', { label: 'Hauptarm', type: 'arm', img: 'systems/sw-tor/icons/slots/iforearm_r.webp' }),
  new HumanoidSlotPrototype('left-arm', { label: 'Nebenarm', type: 'arm', img: 'systems/sw-tor/icons/slots/iforearm_l.webp' }),
  new HumanoidSlotPrototype('right-hand', { label: 'Haupthand', type: 'hand', supportsWeapon: true, img: 'systems/sw-tor/icons/slots/ihand_r.webp', dualWieldPenalty: 3, singleWieldBonus: 3 }),
  new HumanoidSlotPrototype('left-hand', { label: 'Nebenhand', type: 'hand', supportsWeapon: true, img: 'systems/sw-tor/icons/slots/ihand_l.webp', coordination: -3, dualWieldPenalty: 2 }),
  new HumanoidSlotPrototype('belt', { label: 'Gürtel', type: 'hip', img: 'systems/sw-tor/icons/slots/ibelt.webp' }),
  new HumanoidSlotPrototype('legs', { label: 'Beine', type: 'legs', img: 'systems/sw-tor/icons/slots/ihands.webp' }),
  new HumanoidSlotPrototype('feet', { label: 'Füße', type: 'foot', img: 'systems/sw-tor/icons/slots/ihands.webp' }),
]

const map = ObjectUtils.asObject(list, 'key')
export default Object.freeze({
  list,
  map,
  layout: [
    [null, map.head, map.implant],
    [map['right-arm'], map.torso, map['left-arm']],
    [map['right-hand'], map.belt, map['left-hand']],
    [null, map.legs, null],
    [null, map.feet, null],
  ]
})

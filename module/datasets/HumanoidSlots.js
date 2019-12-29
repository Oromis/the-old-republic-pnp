import ObjectUtils from '../util/ObjectUtils.js'
import PropertyPrototype from '../properties/PropertyPrototype.js'
import Property from '../properties/Property.js'

class WeaponSlot extends Property {
  constructor(...args) {
    super(...args)
  }
}

class SlotPrototype extends PropertyPrototype {
  constructor(key, staticData) {
    super(key, { staticData, PropertyClass: staticData.supportsWeapon ? WeaponSlot : Property })
  }
}

const list = [
  { key: 'head', label: 'Kopf', type: 'head', img: 'systems/sw-tor/icons/slots/ihead.webp' },
  { key: 'implant', label: 'Implantat', type: 'implant', img: 'systems/sw-tor/icons/slots/iimplant.webp' },
  { key: 'torso', label: 'Oberkörper', type: 'torso', img: 'systems/sw-tor/icons/slots/iarmor.webp' },
  { key: 'right-arm', label: 'Hauptarm', type: 'arm', img: 'systems/sw-tor/icons/slots/iforearm_r.webp' },
  { key: 'left-arm', label: 'Nebenarm', type: 'arm', img: 'systems/sw-tor/icons/slots/iforearm_l.webp' },
  { key: 'right-hand', label: 'Haupthand', type: 'hand', supportsWeapon: true, img: 'systems/sw-tor/icons/slots/ihand_r.webp' },
  { key: 'left-hand', label: 'Nebenhand', type: 'hand', supportsWeapon: true, img: 'systems/sw-tor/icons/slots/ihand_l.webp', coordination: -3 },
  { key: 'belt', label: 'Gürtel', type: 'hip', img: 'systems/sw-tor/icons/slots/ibelt.webp' },
  { key: 'legs', label: 'Beine', type: 'legs', img: 'systems/sw-tor/icons/slots/ihands.webp' },
  { key: 'feet', label: 'Füße', type: 'foot', img: 'systems/sw-tor/icons/slots/ihands.webp' },
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

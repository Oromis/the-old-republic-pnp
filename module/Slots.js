import ObjectUtils from './ObjectUtils.js'

const list = [
  { key: 'head', label: 'Kopf', type: 'head', img: 'systems/sw-tor/icons/slots/ihead.webp' },
  { key: 'implant', label: 'Implantat', type: 'implant', img: 'systems/sw-tor/icons/slots/iimplant.webp' },
  { key: 'torso', label: 'Oberkörper', type: 'torso', img: 'systems/sw-tor/icons/slots/iarmor.webp' },
  { key: 'left-arm', label: 'Linker Arm', type: 'arm', img: 'systems/sw-tor/icons/slots/iforearm_l.webp' },
  { key: 'right-arm', label: 'Rechter Arm', type: 'arm', img: 'systems/sw-tor/icons/slots/iforearm_r.webp' },
  { key: 'left-hand', label: 'Linke Hand', type: 'hand', img: 'systems/sw-tor/icons/slots/ihand_l.webp' },
  { key: 'right-hand', label: 'Rechte Hand', type: 'hand', img: 'systems/sw-tor/icons/slots/ihand_r.webp' },
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

import ObjectUtils from './util/ObjectUtils.js'

const list = [
  { key: 'melee-weapon', label: 'Nahkampf', isWeapon: true, isMeleeWeapon: true, isEquippable: true, hasEffects: true },
  { key: 'ranged-weapon', label: 'Fernkampf', isWeapon: true, isRangedWeapon: true, isEquippable: true, hasEffects: true },
  { key: 'wearable', label: 'Ausrüstung', isEquippable: true, hasEffects: true, isWearable: true },
  { key: 'consumable', label: 'Verbrauchsgegenstand', hasEffects: true },
  { key: 'other', label: 'Sonstiges' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
  default: 'other',
})

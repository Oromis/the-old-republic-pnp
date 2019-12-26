import ObjectUtils from './util/ObjectUtils.js'

const list = [
  { key: 'physical', label: 'Physisch', icon: 'icons/svg/combat.svg' },
  { key: 'energy', label: 'Energie', icon: 'icons/svg/lightning.svg' },
  { key: 'ion', label: 'Ionen', icon: 'icons/svg/sun.svg' },
  { key: 'fire', label: 'Feuer', icon: 'icons/svg/fire.svg' },
  { key: 'poison', label: 'Gift', icon: 'icons/svg/poison.svg' },
  { key: 'ice', label: 'Eis', icon: 'icons/svg/frozen.svg' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

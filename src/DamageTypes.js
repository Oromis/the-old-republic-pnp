import ObjectUtils from './util/ObjectUtils.js'

const list = [
  { key: 'physical', label: 'Physisch', icon: 'icons/svg/combat.svg', energyEquivalentFactor: 2 },
  { key: 'energy', label: 'Energie', icon: 'icons/svg/lightning.svg', energyEquivalentFactor: 1 },
  { key: 'ion', label: 'Ionen', icon: 'icons/svg/sun.svg', energyEquivalentFactor: 4 },
  { key: 'fire', label: 'Feuer', icon: 'icons/svg/fire.svg', energyEquivalentFactor: 2.5 },
  { key: 'poison', label: 'Gift', icon: 'icons/svg/poison.svg', energyEquivalentFactor: 2.5 },
  { key: 'ice', label: 'Eis', icon: 'icons/svg/frozen.svg', energyEquivalentFactor: 2.5 },
  { key: 'stamina', label: 'Ausdauer', icon: 'icons/svg/statue.svg', targets: [{ key: 'AuP' }], energyEquivalentFactor: 0.5 },
  { key: 'shock', label: 'Shock', icon: 'icons/svg/lightning.svg', targets: [{ key: 'LeP' }, { key: 'AuP', factor: 2 }], energyEquivalentFactor: 2 },
  { key: 'pure', label: 'Pur', icon: 'icons/svg/skull.svg', energyEquivalentFactor: 3.5 },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
  default: 'energy',
})

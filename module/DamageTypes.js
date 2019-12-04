import ObjectUtils from './ObjectUtils.js'

const list = [
  { key: 'physical', label: 'Physisch' },
  { key: 'energy', label: 'Energie' },
  { key: 'ion', label: 'Ionen' },
  { key: 'fire', label: 'Feuer' },
  { key: 'poison', label: 'Gift' },
  { key: 'ice', label: 'Eis' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

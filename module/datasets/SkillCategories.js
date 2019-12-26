import ObjectUtils from '../ObjectUtils.js'

const list = [
  { key: 'melee', label: 'Nahkampf' },
  { key: 'ranged', label: 'Fernkampf' },
  { key: 'physical', label: 'Körperlich' },
  { key: 'crafting', label: 'Handwerk' },
  { key: 'social', label: 'Sozial' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

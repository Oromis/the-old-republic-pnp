import ObjectUtils from '../util/ObjectUtils.js'

const list = [
  { key: 'melee', label: 'Nahkampf', glyph: '\uf715' },
  { key: 'ranged', label: 'Fernkampf', glyph: '\uf337' },
  { key: 'physical', label: 'Körperlich', glyph: '\uf44b' },
  { key: 'crafting', label: 'Handwerk', glyph: '\uf256' },
  { key: 'social', label: 'Sozial', glyph: '\uf0c0' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

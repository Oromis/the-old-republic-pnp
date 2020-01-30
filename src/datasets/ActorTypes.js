import ObjectUtils from '../util/ObjectUtils.js'

const list = [
  { key: 'humanoid', label: 'Humanoid (Biologisch)' },
  { key: 'beast', label: 'Bestie' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
  default: 'humanoid',
})

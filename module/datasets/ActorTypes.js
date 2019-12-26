import ObjectUtils from '../util/ObjectUtils.js'

const list = [
  { key: 'humanoid', label: 'Humanoid (Biologisch)' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
  default: 'humanoid',
})

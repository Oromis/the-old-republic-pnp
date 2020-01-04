import ObjectUtils from '../util/ObjectUtils.js'

const list = [
  { key: null, label: 'Flat' },
  { key: 'max', label: 'Max.' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

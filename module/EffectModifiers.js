import ObjectUtils from './ObjectUtils.js'

const list = [
  { key: null, label: 'None' },
  { key: 'max', label: 'Max.' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

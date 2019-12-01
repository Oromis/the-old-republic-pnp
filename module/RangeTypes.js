import ObjectUtils from './ObjectUtils.js'

const list = [
  { key: 'self', label: 'Selbst' },
  { key: 'touch', label: 'Berührung' },
  { key: 'm', label: 'Meter' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

import ObjectUtils from '../util/ObjectUtils.js'

const list = [
  { key: 'self', label: 'Selbst', format: () => 'Selbst' },
  { key: 'touch', label: 'Berührung', format: () => 'Berührung' },
  { key: 'm', label: 'Meter', format: range => `${range.number}m`, isNumeric: true },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

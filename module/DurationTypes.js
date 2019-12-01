import ObjectUtils from './ObjectUtils.js'

const list = [
  { key: 'instant', label: 'Sofort' },
  { key: 'toggle', label: 'Aktivierbar' },
  { key: 'channeling', label: 'Anhaltend' },
  { key: 'rounds', label: 'Runden' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

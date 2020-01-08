import ObjectUtils from '../util/ObjectUtils.js'

const list = [
  { key: 'InI', label: 'Initiative' },
  { key: 'LaW', label: 'Laufweg' },
  { key: 'EgL', label: 'Energiegenerator-Leistung' },
  { key: 'McL', label: 'Midi-Clorianer-Level' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

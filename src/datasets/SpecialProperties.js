import ObjectUtils from '../util/ObjectUtils.js'

const list = [
  { key: 'InI', label: 'Initiative' },
  { key: 'LaW', label: 'Laufweg' },
  { key: 'EgL', label: 'Energiegenerator-Leistung' },
  { key: 'McL', label: 'Midi-Clorianer-Level' },
  { key: 'ElA', label: 'Attacke-Erleichterung' },
  { key: 'ElP', label: 'Parade-Erleichterung' },
  { key: 'ElP_F', label: 'Parade-Erleichterung gg. Fernkampf' },
  { key: 'ElP_N', label: 'Parade-Erleichterung gg. Nahkampf' },
  { key: 'ElD', label: 'Defensive-Erleichterung' },
  { key: 'ElD_F', label: 'Defensive-Erleichterung gg. Fernkampf' },
  { key: 'ElD_N', label: 'Defensive-Erleichterung gg. Nahkampf' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

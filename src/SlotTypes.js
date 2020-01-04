import ObjectUtils from './util/ObjectUtils.js'

const list = [
  { key: 'head', label: 'Kopf' },
  { key: 'torso', label: 'Oberkörper' },
  { key: 'arm', label: 'Arm' },
  { key: 'hand', label: 'Hand' },
  { key: 'hip', label: 'Hüfte' },
  { key: 'implant', label: 'Implantat' },
  { key: 'legs', label: 'Beine' },
  { key: 'foot', label: 'Fuß' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

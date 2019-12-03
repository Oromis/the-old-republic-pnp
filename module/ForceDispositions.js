import ObjectUtils from './ObjectUtils.js'

const list = [
  { key: 'neutral', label: 'Neutral' },
  { key: 'light', label: 'Hell' },
  { key: 'dark', label: 'Dunkel' },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

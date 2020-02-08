import ObjectUtils from '../util/ObjectUtils.js'

const list = [
  { key: 'neutral', label: 'Neutral', weight: 50, excludeDispositions: ['military'] },
  { key: 'republic', label: 'Republik', weight: 8, excludeDispositions: ['criminal'] },
  { key: 'sith', label: 'Sith', weight: 6 },
  { key: 'mandalorian', label: 'Mandalorianer', weight: 2, excludeDispositions: ['criminal', 'force'] },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
  filteredList({ disposition = null }) {
    let result = list
    if (disposition) {
      if (typeof disposition === 'object' && disposition.key != null) {
        disposition = disposition.key
      }
      result = result.filter(faction => {
        return Array.isArray(faction.excludeDispositions) ? !faction.excludeDispositions.includes(disposition) : true
      })
    }
    return result
  },
})

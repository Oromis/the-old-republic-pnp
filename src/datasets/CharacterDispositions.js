import ObjectUtils from '../util/ObjectUtils.js'
import Factions from './Factions.js'

const list = [
  { key: 'military', label: 'Militärisch', weight: 15 },
  { key: 'civil', label: 'Zivil', weight: 69 },
  { key: 'criminal', label: 'Kriminell', weight: 15 },
  { key: 'force', label: 'Machtsensitiv', weight: 1 },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
  filteredList({ faction = null }) {
    let result = list
    if (faction) {
      if (typeof faction === 'string') {
        faction = Factions.map[faction]
      }
      result = result.filter(disposition => {
        return Array.isArray(faction.excludeDispositions) ? !faction.excludeDispositions.includes(disposition.key) : true
      })
    }
    return result
  },
})

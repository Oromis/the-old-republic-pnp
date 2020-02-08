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
  filteredList({ faction = null, trainings = [] }) {
    let result = [...list]
    if (faction) {
      if (typeof faction === 'string') {
        faction = Factions.map[faction]
      }
      result = result.filter(disposition => {
        return Array.isArray(faction.excludeDispositions) ? !faction.excludeDispositions.includes(disposition.key) : true
      })
    }
    if (Array.isArray(trainings)) {
      for (const training of trainings) {
        if (training.dispositions != null && Object.values(training.dispositions).some(v => v)) {
          // If the training restricts dispositions we need to be in this list to continue
          result = result.filter(disposition => training.dispositions[disposition.key])
        }
      }
    }
    return result
  },
})

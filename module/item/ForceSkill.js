import DataSets from '../datasets/DataSets.js'
import DurationTypes from '../datasets/DurationTypes.js'
import { defineEnumAccessor } from '../util/EntityUtils.js'

export default {
  beforeConstruct() {
    defineEnumAccessor(this, 'duration', { dataKey: 'duration.type', dataSetKey: 'durationTypes', instanceDataKey: 'duration' })
  },

  afterPrepareData(actorData) {
    actorData.duration = this.duration.update().db
  },
}

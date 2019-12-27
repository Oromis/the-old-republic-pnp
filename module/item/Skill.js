import DataSets from '../datasets/DataSets.js'
import { defineDataAccessor, defineEnumAccessor, defineGetter } from '../util/EntityUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'key')
    defineGetter(this, 'label', function () { return this.name })
    defineDataAccessor(this, 'xpCategory')
    defineDataAccessor(this, 'category')

    defineGetter(this, 'actorDataSet', function () {
      if (this.actor != null) {
        return this.actor.dataSet
      } else {
        return DataSets.fromActorType(this.data.actorType)
      }
    })

    defineGetter(this, 'isRegularSkill', function () { return this.type === 'skill' })
    defineGetter(this, 'isForceSkill', function () { return this.type === 'force-skill' })

    defineEnumAccessor(this, 'attribute1', { getEnumData: () => this.actorDataSet.attributes, configurable: true })
    defineEnumAccessor(this, 'attribute2', { getEnumData: () => this.actorDataSet.attributes, configurable: true })

    this._addUpdateFilter('data.key', data => {
      // Ensures that skill keys are stored as lowercase internally
      if (typeof data.data.key === 'string') {
        data.data.key = data.data.key.toLowerCase()
      }
    })
  }
}

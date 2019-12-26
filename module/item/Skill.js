import DataSets from '../datasets/DataSets.js'
import { defineDataAccessor, defineEnumAccessor } from '../util/EntityUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'key')
    defineDataAccessor(this, 'xpCategory')
    defineDataAccessor(this, 'category')

    Object.defineProperty(this, 'actorDataSet', {
      get() {
        if (this.actor != null) {
          return this.actor.dataSet
        } else {
          return DataSets.fromActorType(this.data.actorType)
        }
      }
    })

    Object.defineProperty(this, 'isRegularSkill', { get() { return this.type === 'skill' }})
    Object.defineProperty(this, 'isForceSkill', { get() { return this.type === 'force-skill' }})

    defineEnumAccessor(this, 'attribute1', { getEnumData: () => this.actorDataSet.attributes, configurable: true })
    defineEnumAccessor(this, 'attribute2', { getEnumData: () => this.actorDataSet.attributes, configurable: true })
  }
}

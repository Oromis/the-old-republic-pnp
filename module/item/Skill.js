import DataSets from '../datasets/DataSets.js'

export default {
  beforeConstruct() {
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
  }
}

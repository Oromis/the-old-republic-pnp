import { calcFreeXp, calcGp, calcTotalXp } from '../CharacterFormulas.js'

/**
 * Functionality for humanoid characters. "humanoid" refers to intelligent life forms, it has
 * nothing to do with physical properties. E.g. an insectoid species like the Geonosians would be
 * classified as humanoid too.
 *
 * This is a mixin module. It's method will be called at the corresponding points in the actor's
 * lifecycle. `this` refers to the actor.
 *
 * This is done instead of an inheritance relationship because FoundryVTT doesn't support different
 * actor classes for different actor types (yet).
 */
export default {
  afterConstruct() {
    this._defineDataAccessor('xp')
    this._defineDataAccessor('gp')
  },

  afterPrepareData(actorData) {
    actorData.data.gp.value = calcGp(this)
    actorData.data.xp.total = calcTotalXp(this)
    actorData.data.xp.free = calcFreeXp(this)
  }
}


import PRNG from '../util/PRNG.js'
import SwTorActor from './SwTorActor.js'

const generator = {
  getChoices(actor) {
    const species = this.getSpeciesChoices(actor)
    const dispositions = this.getDispositionChoices(actor, { faction: actor.data.data.generator.faction })
    const factions = this.getFactionChoices(actor, { disposition: actor.data.data.generator.disposition })
    return { species, dispositions, factions }
  },

  getSpeciesChoices(actor) {
    return actor.dataSet.species.list
  },

  getDispositionChoices(actor, { faction = null } = {}) {
    return actor.dataSet.dispositions.filteredList({ faction })
  },

  getFactionChoices(actor, { disposition = null } = {}) {
    return actor.dataSet.factions.filteredList({ disposition })
  },

  async generate(originalActor, updateData = {}) {
    const tmpData = mergeObject(originalActor.data, expandObject(updateData), { inplace: false, enforceTypes: true })
    const actor = new SwTorActor(tmpData, originalActor.options)

    const generatorData = actor.data.data.generator || {}
    let seed = generatorData.seed
    if (!seed) {
      seed = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      updateData['data.generator.seed'] = seed
    }

    const prng = new PRNG(seed)

    const species = this.pickOne({ actor, generatorData, updateData, prng, key: 'species', options: this.getSpeciesChoices(actor) })
    const disposition = this.pickOne({
      actor, generatorData, updateData, prng, key: 'disposition',
      options: this.getDispositionChoices(actor, { species, faction: generatorData.faction })
    })
    this.pickOne({
      actor, generatorData, updateData, prng,
      key: 'faction', options: this.getFactionChoices(actor, { disposition, species }),
    })

    return originalActor.update(updateData)
  },

  pickOne({ actor, generatorData, updateData, prng, key, options }) {
    let result = actor[key]
    if (!generatorData[key]) {
      result = prng.fromWeightedArray(options)
      updateData[`data.${key}`] = result.key
    } else {
      const lookedUp = options.find(option => option.key === generatorData[key])
      if (lookedUp != null) {
        result = lookedUp
        updateData[`data.${key}`] = result.key
      }
    }
    return result
  }
}

export default generator

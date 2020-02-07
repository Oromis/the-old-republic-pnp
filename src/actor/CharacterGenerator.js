import PRNG from '../util/PRNG.js'

const generator = {
  async generate(actor) {
    const generatorData = actor.data.data.generator || {}
    const updateData = {}
    let seed = generatorData.seed
    if (!seed) {
      seed = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      updateData['data.generator.seed'] = seed
    }

    const prng = new PRNG(seed)

    let species = actor.species
    if (generatorData.species == null) {
      species = prng.fromWeightedArray(actor.dataSet.species.list)
      updateData['data.species'] = species.key
    }

    const stats = {}
    for (let i = 0; i < 10000; ++i) {
      const spec = prng.fromWeightedArray(actor.dataSet.species.list)
      stats[spec.key] = (stats[spec.key] || 0) + 1
    }
    console.log(stats)

    return actor.update(updateData)
  }
}

export default generator

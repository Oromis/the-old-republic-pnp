import PRNG from '../util/PRNG.js'
import SwTorActor from './SwTorActor.js'
import SwTorItem from '../item/SwTorItem.js'
import ObjectUtils from '../util/ObjectUtils.js'

const trainingSlots = Object.freeze([
  { key: 'primary', chance: 1 },
  { key: 'secondary', chance: 0.3 },
  { key: 'tertiary', chance: 0.01 }
])

function areTrainingsCompatible(a, b) {
  for (const [key, active] of Object.entries(a.dispositions)) {
    if (active && b.dispositions[key]) {
      return true
    }
  }
  return false
}

const generator = {
  trainingSlots,

  getFixedTrainings(actor) {
    const generatorData = actor.data.data.generator || {}
    const fixedTrainingsMap = generatorData.trainings || {}
    return game.items.entities.filter(i => i.type === 'training' && Object.values(fixedTrainingsMap).includes(i.name))
  },

  getChoices(actor) {
    const generatorData = actor.data.data.generator || {}
    const fixedDisposition = generatorData.disposition
    const fixedFaction = generatorData.faction
    const fixedTrainingsMap = generatorData.trainings || {}
    const fixedTrainings = this.getFixedTrainings(actor)

    const species = this.getSpeciesChoices(actor)
    const dispositions = this.getDispositionChoices(actor, { faction: fixedFaction, trainings: fixedTrainings })
    const factions = this.getFactionChoices(actor, { disposition: fixedDisposition, trainings: fixedTrainings })
    const trainings = this.getTrainingChoices(actor, { disposition: fixedDisposition, faction: fixedFaction, fixedTrainings })
    return {
      species, dispositions, factions,
      trainings: trainingSlots.reduce((acc, { key }) => {
        acc[key] = trainings.filter(training => (
          training.name === fixedTrainingsMap[key] || !Object.values(fixedTrainingsMap).includes(training.name)
        ))
        return acc
      }, {})
    }
  },

  getSpeciesChoices(actor) {
    return [...actor.dataSet.species.list]
  },

  getDispositionChoices(actor, { faction = null, trainings = [] } = {}) {
    return actor.dataSet.dispositions.filteredList({ faction, trainings })
  },

  getFactionChoices(actor, { disposition = null, trainings = [] } = {}) {
    return actor.dataSet.factions.filteredList({ disposition, trainings })
  },

  getTrainingChoices(actor, { disposition = null, faction = null, fixedTrainings = [] } = {}) {
    return game.items.entities.filter(i => {
      if (i.type !== 'training') {
        return false
      }
      if (fixedTrainings.includes(i)) {
        return true
      }
      if (typeof disposition === 'object' && disposition != null) {
        disposition = disposition.key
      }
      if (typeof faction === 'object' && faction != null) {
        faction = faction.key
      }
      return (!i.dispositions || !disposition || i.dispositions[disposition]) &&
        (!i.factions || !faction || i.factions[faction])
    })
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

    const newItemsList = []
    const deleteItemsList = []

    const prng = new PRNG(seed)

    const fixedTrainings = this.getFixedTrainings(actor)

    const species = this.pickOne({
      actor, generatorData, updateData, prng, key: 'species',
      choices: this.getSpeciesChoices(actor)
    })
    const disposition = this.pickOne({
      actor, generatorData, updateData, prng, key: 'disposition',
      choices: this.getDispositionChoices(actor, { species, faction: generatorData.faction, trainings: fixedTrainings })
    })
    const faction = this.pickOne({
      actor, generatorData, updateData, prng,
      key: 'faction', choices: this.getFactionChoices(actor, { disposition, species, trainings: fixedTrainings }),
    })

    // Pick trainings
    deleteItemsList.push(...actor.trainings)
    const trainingChoices = this.getTrainingChoices(actor, { disposition, faction, fixedTrainings })
    const trainings = this.pickTrainings({ generatorData, prng, disposition, faction, trainingChoices, fixedTrainings })
    newItemsList.push(...trainings)

    // Perform actor updates
    if (deleteItemsList.length > 0) {
      await originalActor.deleteManyEmbeddedEntities('OwnedItem', deleteItemsList.map(item => item.id != null ? item.id : item))
    }
    await originalActor.createManyEmbeddedEntities('OwnedItem', newItemsList.map(item => (
      ObjectUtils.cloneDeep((item instanceof SwTorItem) ? item.data : item)
    )))
    return originalActor.update(updateData)
  },

  pickOne({ actor, generatorData, updateData, prng, key, choices }) {
    let result = actor[key]
    if (!generatorData[key]) {
      result = prng.fromWeightedArray(choices)
      updateData[`data.${key}`] = result.key
    } else {
      const lookedUp = choices.find(option => option.key === generatorData[key])
      if (lookedUp != null) {
        result = lookedUp
        updateData[`data.${key}`] = result.key
      }
    }
    return result
  },

  pickTrainings({ generatorData, prng, trainingChoices, disposition, faction, fixedTrainings }) {
    const trainings = []
    for (let { key, chance } of trainingSlots) {
      let training
      const fixedTrainingsMap = generatorData.trainings || {}
      if (fixedTrainingsMap[key]) {
        // User-defined training
        const index = trainingChoices.findIndex(training => training.name === fixedTrainingsMap[key])
        if (index !== -1) {
          training = trainingChoices[index]
        }
      }

      if (training == null) {
        // Auto-pick a training
        let choices = trainingChoices.filter(c => !fixedTrainings.includes(c))

        const baseTrainings = []
        const advancedTrainings = []
        for (const existingTraining of trainings) {
          if (existingTraining.isBaseTraining) {
            baseTrainings.push(existingTraining)
          }
          if (existingTraining.needsBaseTraining) {
            advancedTrainings.push(existingTraining)
          }
        }

        // There needs to be a base training for each advanced training
        for (const adv of advancedTrainings) {
          // Find matching base training by matching dispositions
          const base = baseTrainings.find(base => areTrainingsCompatible(adv, base))
          if (base == null) {
            // No base training for an advanced training => we need to pick one
            choices = choices.filter(c => c.isBaseTraining && areTrainingsCompatible(adv, c))
            if (choices.length === 0) {
              // There's no matching base training available ... Reset.
              choices = trainingChoices.filter(c => !fixedTrainings.includes(c))
            } else {
              // We definitely want to have learned a base training
              chance = 1
              break
            }
          }
        }

        const unmatchedBaseTrainings = baseTrainings.filter(base => (
          advancedTrainings.every(adv => !areTrainingsCompatible(adv, base))
        ))
        if (unmatchedBaseTrainings.length > 0) {
          // Increase the chance for another training if a base training has been completed
          chance = Math.min(1, chance * 2.5)
        }

        if (prng.decide(chance)) {
          // OK, we're actually gonna add another training. Calculate weights
          let weightedTrainings = choices.map(training => {
            let weight = 1
            if (training.dispositions && training.dispositions[disposition.key]) {
              weight *= 2
            }
            if (training.factions && training.factions[faction.key]) {
              weight *= 2
            }
            if (training.needsBaseTraining && unmatchedBaseTrainings.some(base => areTrainingsCompatible(training, base))) {
              // We already have a corresponding base training, so we might want to learn a compatible advanced training
              weight *= 3
            }
            return { id: training.id, weight }
          })

          console.log(`Picking training from weighted array: \n${weightedTrainings.map(t => `${trainingChoices.find(i => i.id === t.id).name} => ${t.weight}`).join('\n')}`)
          const chosen = prng.fromWeightedArray(weightedTrainings)
          if (chosen != null) {
            training = trainingChoices.find(t => t.id === chosen.id)
          } else {
            console.warn(`Failed to pick a training from choices ${JSON.stringify(weightedTrainings)}`)
          }
        }
      }

      if (training != null) {
        trainings.push(training)

        // Remove the training we picked from our future choices
        trainingChoices = trainingChoices.filter(t => t !== training)
      }
    }

    return trainings
  },
}

export default generator

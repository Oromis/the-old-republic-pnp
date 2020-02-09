import PRNG from '../util/PRNG.js'
import SwTorActor from './SwTorActor.js'
import SwTorItem from '../item/SwTorItem.js'
import ObjectUtils from '../util/ObjectUtils.js'
import Config from '../Config.js'
import {clamp, isInRange, lerp} from '../util/MathUtils.js'

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

function improveProp({ actor, propType, key, cost }) {
  if (!Array.isArray(actor.data.data[propType][key].gained)) {
    actor.data.data[propType][key].gained = []
  }
  actor.data.data[propType][key].gained.push({ xp: cost, xpCategory: actor[propType][key].effectiveXpCategory })
  actor.data.data[propType][key].xp = (actor.data.data[propType][key].xp || 0) + cost
}

function calcPropWeight(prop) {
  if (prop.value.total >= Config.character.maxPropValue) {
    return 0
  } else {
    return prop.value.total
  }
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
    const tmpData = mergeObject(originalActor.data, expandObject(updateData), { inplace: false, enforceTypes: false })
    const itemTypesToRemove = ['training', 'innate-ability', 'skill', 'force-skill']
    const deleteItemsList = tmpData.items.filter(i => itemTypesToRemove.includes(i.type))
    tmpData.items = tmpData.items.filter(i => !itemTypesToRemove.includes(i.type))
    for (const attr of Object.values(tmpData.data.attributes || {})) {
      attr.gp = 0
      attr.gained = []
      attr.xp = 0
    }
    for (const metric of Object.values(tmpData.data.metrics || {})) {
      metric.gp = 0
      metric.gained = []
      metric.xp = 0
    }
    const actor = new SwTorActor(tmpData, originalActor.options)
    let gp = actor.data.data.gp.initial || 500
    console.log(`Generating NPC with ${gp} GP`)

    const generatorData = actor.data.data.generator || {}
    let seed = generatorData.seed
    if (!seed) {
      seed = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      updateData['data.generator.seed'] = seed
    }

    const newItemsList = []

    const prng = new PRNG(seed)

    const fixedTrainings = this.getFixedTrainings(actor)

    const species = this.pickOne({
      actor, generatorData, updateData, prng, key: 'species',
      choices: this.getSpeciesChoices(actor)
    })
    gp -= species.gp
    const disposition = this.pickOne({
      actor, generatorData, updateData, prng, key: 'disposition',
      choices: this.getDispositionChoices(actor, { species, faction: generatorData.faction, trainings: fixedTrainings })
    })
    const faction = this.pickOne({
      actor, generatorData, updateData, prng,
      key: 'faction', choices: this.getFactionChoices(actor, { disposition, species, trainings: fixedTrainings }),
    })

    // Pick trainings
    const trainingChoices = this.getTrainingChoices(actor, { disposition, faction, fixedTrainings })
    const trainings = this.pickTrainings({ generatorData, prng, disposition, faction, trainingChoices, fixedTrainings })
    newItemsList.push(...trainings)
    gp -= trainings.reduce((sum, cur) => sum + (+cur.gp), 0)
    console.log(`Picked trainings. GP remaining: ${gp}`)

    // Pick innate abilities
    if (disposition === actor.dataSet.dispositions.map.force) {
      // This char needs to be force-sensitive
      console.log(`Picking force innate ability`)
      const forceInnates = game.items.entities.filter(item => item.type === 'innate-ability' &&
        Array.isArray(item.effects) && item.effects.some(effect => effect.key === 'McL'))
      const forceInnate = prng.fromArray(forceInnates)
      if (forceInnate != null) {
        newItemsList.push(forceInnate)
        gp -= forceInnate.gp
        console.log(`Picked force ability. GP remaining: ${gp}`)
      } else {
        console.warn(`Failed to pick force innate (${forceInnates.length} available)`)
      }
    }

    // Collect skills
    actor.data.items.push(...newItemsList.map(item => ObjectUtils.cloneDeep(item.data)))
    actor.prepareEmbeddedEntities() // Needed so that missingSkills picks up the bonuses from trainings
    actor.clearCache()
    actor.data.items.push(...actor.missingSkills.map(skill => ObjectUtils.cloneDeep(skill.data)))
    actor.prepareEmbeddedEntities()
    actor.clearCache()

    // Spend GP on attributes
    const minAttributeGp = actor.dataSet.attributes.list.length * Config.character.attributes.gp.min
    let attributeGp = prng.intFromRange({
      min: clamp(300, { min: minAttributeGp, max: gp }),
      max: clamp(450, { min: minAttributeGp, max: gp })
    })
    gp -= attributeGp
    console.log(`Distributing ${attributeGp} GP to attributes. GP remaining: ${gp}`)
    this.distributeGpToAttributes({ actor, prng, gp: attributeGp, })

    // Turn remaining GP to XP and spend them
    const gainedXp = generatorData.xp || 0
    const xpFromGp = gp * Config.character.gpToXpRate
    actor.data.data.xp.gained = gainedXp
    actor.data.data.xp.gp = gp
    updateData['data.xp.gained'] = gainedXp
    updateData['data.xp.gp'] = gp
    let xp = gainedXp + xpFromGp
    console.log(`Spending ${xp} XP ...`)
    this.spendXp({ actor, prng, xp })

    // Pick weapons for the character
    const itemsToEquip = this.pickWeapons({ actor, prng, xpLevel: gainedXp, newItemsList })

    // Perform actor updates
    actor.clearCache()
    newItemsList.push(...actor.skills.list)
    for (const [key, attr] of Object.entries(actor.data.data.attributes)) {
      updateData[`data.attributes.${key}.gp`] = attr.gp
      updateData[`data.attributes.${key}.gained`] = attr.gained
      updateData[`data.attributes.${key}.xp`] = attr.xp
    }
    for (const metric of actor.metrics.list) {
      if (metric.max > 0) {
        updateData[`data.metrics.${metric.key}.value`] = metric.max
        updateData[`data.metrics.${metric.key}.gained`] = metric.gained
        updateData[`data.metrics.${metric.key}.xp`] = metric.xp
      }
    }
    if (originalActor.data.data.targetDistance.value == null) {
      updateData['data.targetDistance.value'] = 12  // Set default target distance to something reasonable
    }
    if (deleteItemsList.length > 0) {
      await originalActor.deleteManyEmbeddedEntities('OwnedItem', deleteItemsList.map(item => item.id || item._id || item))
    }
    await originalActor.createManyEmbeddedEntities('OwnedItem', newItemsList.map(item => (
      ObjectUtils.cloneDeep((item instanceof SwTorItem) ? item.data : item)
    )))
    await originalActor.updateManyEmbeddedEntities('OwnedItem', originalActor.equippedItems.map(item => ({
      _id: item.id,
      'data.slots': [],
    })))
    await originalActor.update(updateData)
    originalActor.prepareEmbeddedEntities()
    originalActor.clearCache()

    // Equip items
    for (let item of itemsToEquip) {
      const slots = []
      for (const slotType of item.slotTypes) {
        const slot = originalActor.dataSet.slots.list.find(slot => slot.type === slotType &&
          originalActor.getItemInSlot(slot.key) == null &&
          !slots.includes(slot))
        slots.push(slot)
      }
      // Resolve the actual item instance on the original actor
      item = originalActor.freeItems.find(i => i.type === item.type && i.name === item.name)
      if (slots.length > 0 && slots.every(slot => slot != null) && item != null) {
        await originalActor.equipItem(slots[0].key, item)
      }
    }
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

  distributeGpToAttributes({ actor, prng, gp }) {
    const weightedAttributes = actor.dataSet.attributes.list.map(attribute => {
      return {
        key: attribute.key,
        ...attribute.staticData,
        // Weigh attributes by the skills that contribute to them
        weight: actor.skills.list
          .filter(skill => skill.attribute1.key === attribute.key || skill.attribute2.key === attribute.key)
          .reduce((sum, cur) => sum + cur.value.total, 0)
      }
    })
    console.log(`Picking attributes from weighted array: \n${weightedAttributes.map(t => `${t.label} => ${t.weight}`).join('\n')}`)
    for (const attr of weightedAttributes) {
      // Add minimum points to all attributes
      const usedGp = Math.min(Config.character.attributes.gp.min, gp)
      actor.data.data.attributes[attr.key].gp = usedGp
      gp -= usedGp
    }
    while (gp-- > 0) {
      const attr = prng.fromWeightedArray(weightedAttributes)
      ++actor.data.data.attributes[attr.key].gp
    }
  },

  spendXp({ actor, prng, xp }) {
    const weightedProps = [{ prop: 'attribute', weight: 1 }, { prop: 'metric', weight: 1 }, { prop: 'skill', weight: 10 }]
    const metricsChoices = actor.metrics.list
      .filter(metric => metric.canBuyPoints && metric.max > 0)
    while (xp > 0) {
      actor.prepareData()
      actor.clearCache()

      // Pick the next property to improve
      const { prop } = prng.fromWeightedArray(weightedProps)
      let improvement
      switch (prop) {
        case 'attribute': {
          const attr = prng.fromWeightedArray(actor.attributes.list, { calcWeight: calcPropWeight })
          const cost = attr.upgradeCost
          improvement = {
            cost,
            action: () => improveProp({ actor, propType: 'attributes', key: attr.key, cost })
          }
          break
        }

        case 'skill': {
          const skill = prng.fromWeightedArray(actor.skills.list, { calcWeight: calcPropWeight })
          const cost = skill.upgradeCost
          improvement = {
            cost,
            action: () => {
              const item = actor.data.items.find(item => item.type === skill.type && item.data.key === skill.key)
              if (item == null) {
                throw new Error(`Missing skill. This is a bug.`)
              }
              if (!Array.isArray(item.data.gained)) {
                item.data.gained = []
              }
              item.data.gained.push({ xp: cost, xpCategory: skill.effectiveXpCategory })
              item.data.xp = (item.data.xp || 0) + cost
              actor.prepareEmbeddedEntities()
            }
          }
          break
        }

        case 'metric': {
          const metric = prng.fromWeightedArray(metricsChoices, { calcWeight: metric => metric.max })
          const cost = actor.metrics[metric.key].upgradeCost
          improvement = {
            cost,
            action: () => improveProp({ actor, cost, key: metric.key, propType: 'metrics' })
          }
          break
        }

        default:
          throw new Error(`Unknown prop type ${prop}. This is a bug.`)
      }

      if (improvement.cost == null || improvement.cost > xp) {
        // Cannot afford this upgrade => we're done generating this char
        break
      } else {
        // We can afford it => do so
        xp -= improvement.cost
        improvement.action()
      }
    }
  },

  pickWeapons({ actor, prng, xpLevel, newItemsList }) {
    const minProficiencyForWeapon = 15
    const safeProficiencyForWeapon = 50
    const eligibleSkills = actor.skills.list
      .filter(skill => skill.isWeaponSkill && skill.value.total >= minProficiencyForWeapon)
      .sort((a, b) => b.value.total - a.value.total)  // Highest skill proficiency first
    let chanceFactor = 1.5
    const pickedSkills = eligibleSkills.filter(skill => {
      const chance = clamp(chanceFactor * (skill.value.total - minProficiencyForWeapon) / (safeProficiencyForWeapon - minProficiencyForWeapon))
      const result = prng.decide(chance)
      if (result) {
        // The more weapons the char already has the more difficult it is to get more
        chanceFactor -= 0.5
      }
      return result
    })

    const weaponsToEquip = []

    // See if the char already has appropriate weapons for the skills we picked
    for (const skill of pickedSkills) {
      const weapons = actor.inventory.filter(item => item.data.data.skill === skill.key)
      if (weapons.length === 0) {
        // No weapon for this skill yet => add at least one
        let availableSlots = actor.dataSet.slots.list.filter(slot => slot.supportsWeapon).length
        while (availableSlots > 0) {
          const weapon = this.pickWeapon({ prng, skill, xpLevel, maxSlotCount: availableSlots })
          if (weapon != null) {
            console.log(`Picked weapon ${weapon.name}`)
            weapons.push(weapon)
            newItemsList.push(weapon)
            availableSlots -= weapon.slotTypes.length
            if (availableSlots > 0) {
              // See if we want to add another weapon
              const chance = 0.7 * (skill.value.total / 100)
              console.log(`Adding another weapon with probability ${chance}`)
              if (!prng.decide(chance)) {
                break
              }
            }
          } else {
            break
          }
        }
      }

      if (weaponsToEquip.length === 0) {
        weaponsToEquip.push(...weapons)
      }
    }

    return weaponsToEquip.sort((a, b) => b.normalizedDamage - a.normalizedDamage)
  },

  /**
   * Basic idea: Give the actors better weapons as they get more XP while also having an element of randomness in the
   * weapon selection
   */
  pickWeapon({ skill, prng, xpLevel, maxSlotCount }) {
    const worstWeaponXp = 0
    const bestWeaponXp = 50000
    const xpBracketSize = 0.2
    const damageBracketSize = 0.1

    const matchingItems = game.items.entities
      .filter(item => (
        item.isWeapon && item.data.data.skill === skill.key &&
        typeof item.normalizedDamage === 'number' &&
        Array.isArray(item.slotTypes) && item.slotTypes.length <= maxSlotCount
      ))
      .sort((a, b) => a.normalizedDamage - b.normalizedDamage)  // Sort by damage output
    if (matchingItems.length > 0) {
      const damageRange = [matchingItems[0].normalizedDamage, matchingItems[matchingItems.length - 1].normalizedDamage]
      const damageValueRange = damageRange[1] - damageRange[0]
      const xpPerc = clamp(
        Math.pow(lerp(xpLevel, { minX: worstWeaponXp, maxX: bestWeaponXp, clamp: true }), 1.5)  // Exponential damage increase with XP gain
          + prng.fromRange({ min: -xpBracketSize, max: xpBracketSize })   // Random variations (+- 20%) within the XP bracket
      )
      const targetDamage = lerp(xpPerc, { minY: damageRange[0], maxY: damageRange[1] }) // Scale expected weapon damage with XP
      const damageBracket = [targetDamage - damageValueRange * damageBracketSize, targetDamage + damageValueRange * damageBracketSize]

      // Find weapons fitting in the damage bracket
      const matchingWeapons = matchingItems.filter(i => isInRange(damageBracket[0], i.normalizedDamage, damageBracket[1]))
      if (matchingWeapons.length > 0) {
        // Pick on at random
        return prng.fromArray(matchingWeapons)
      } else {
        // No weapon matches out damage bracket... Pick the weapon that is closest to our target damage
        return matchingItems.reduce((res, cur) => {
          const curDist = Math.abs(targetDamage - cur.normalizedDamage)
          if (curDist < res.distance) {
            res.distance = curDist
            res.weapon = cur
          }
          return res
        }, { distance: Infinity, weapon: null })
      }
    } else {
      console.warn(`No matching weapon for skill ${skill.name} available!`)
      return null
    }
  },
}

export default generator

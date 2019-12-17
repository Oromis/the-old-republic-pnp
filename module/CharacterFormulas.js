import Config from './Config.js'
import ObjectUtils from './ObjectUtils.js'
import Species from './Species.js'
import Attributes, {attrValue} from './Attributes.js'
import XpTable from './XpTable.js'
import Metrics from './Metrics.js'

export function detectPropertyType(property) {
  const key = property.key
  if (key.startsWith('r_')) {
    return 'resistance'
  } else if (key.length === 2) {
    return 'attribute'
  } else if (key.length === 3) {
    if (key.match(/[A-Z][a-z][A-Z]/)) {
      return 'metric'
    } else {
      return 'skill'
    }
  } else {
    throw new Error(`Unknown property type: ${key}`)
  }
}

function getKey(property) {
  return typeof property === 'string' ? property : property.key
}

function getBaseValue(actor, property, { target = 'value' } = {}) {
  switch (detectPropertyType(property)) {
    case 'attribute':
      return 0
    case 'skill':
      return 5
    case 'metric':
      return target === 'value' ? 5 : property.calcBaseValue(actor)
    case 'resistance':
      return 0
    default:
      throw new Error(`Property type without base value: ${property.key}`)
  }
}

export function calcGp(actor) {
  return (actor.gp.initial || Config.character.initialGp)
    - (actor.xp.gp || 0)
    - ObjectUtils.try(Species.map[actor.species], 'gp', { default: 0 })
    - Object.values(actor.attributes).reduce((acc, cur) => acc + (cur.gp || 0), 0)
    - actor.trainings.reduce((acc, cur) => acc + (+cur.data.gp), 0)
}

export function calcFreeXp(actor) {
  return calcTotalXp(actor) -
    Attributes.list.reduce((acc, cur) => {
      return acc + ObjectUtils.try(actor.attributes, cur.key, 'xp', { default: 0 })
    }, 0) -
      actor.skills.reduce((acc, skill) => acc + calcSkillXp(actor, skill.data), 0) -
    Metrics.list.reduce((acc, cur) => {
      return acc + ObjectUtils.try(actor.metrics, cur.key, 'xp', { default: 0 })
    }, 0)
}

export function calcTotalXp(actor) {
  return actor.xp.gp * Config.character.gpToXpRate + actor.xp.gained
}

export function calcSkillXp(actor, property) {
  let result = property.xp || 0
  if (!property.isBasicSkill && calcPropertyTrainingsEffects(actor, property) === 0) {
    // Non-basic skills need to be activated
    result += XpTable.getActivationCost(property.xpCategory)
  }
  return result
}

function calcXpFromTrainingSkill(training, property, from) {
  const key = getKey(property)
  if(training.data.baseTraining) {
    from += (+training.data.baseTraining.data.effects[key]) || 0
  }
  return XpTable.getUpgradeCost({
    category: property.xpCategory,
    from: from,
    to: from + (+training.data.effects[key])
  })
}

export function calcPropertyTrainingsEffects(actor, property) {
  if(detectPropertyType(property) !== 'skill') {
    return actor.trainings.map(t => ObjectUtils.try(t.data.effects, getKey(property), {default: 0})).reduce((acc, v) => acc + (+v), 0)
  }
  const from = property.isBasicSkill ? 5 : 0
  const xp = actor.trainings.map(t => calcXpFromTrainingSkill(t, property, from)).reduce((acc, v) => acc + (+v), 0)
  return XpTable.getPointsFromXp({
    category: property.xpCategory,
    xp,
    from
  })
}

function explainSpeciesMod(actor, property) {
  const key = typeof property === 'string' ? property : property.key
  const species = Species.map[(actor.species || Species.default)]
  return { label: species.name, value: ObjectUtils.try(species, 'mods', key, { default: 0 })}
}

function calcPropertySpeciesMod(actor, property) {
  return explainSpeciesMod(actor, property).value
}

export function explainEffect(actor, property) {
  const components = [
    explainSpeciesMod(actor, property),
    { label: 'Ausbildungen', value: calcPropertyTrainingsEffects(actor, property)}
  ].filter(mod => mod.value !== 0)
  return {
    total: components.reduce((acc, cur) => acc + cur.value, 0),
    components
  }
}

export function explainPropertyBaseValue(actor, property, options) {
  const result = explainEffect(actor, property)
  const gp = ObjectUtils.try(property, 'gp', { default: 0 })
  if (gp !== 0) {
    result.total += gp
    result.components.unshift({ label: 'GP', value: gp })
  }
  let base = getBaseValue(actor, property, options)
  if(detectPropertyType(property) === 'skill'
      && !property.isBasicSkill
      && calcPropertyTrainingsEffects(actor, property) > 0) {
    base = 0
  }
  if (base !== 0) {
    result.total += base
    result.components.unshift({ label: 'Basis', value: base })
  }
  return result
}

export function calcPropertyBaseValue(actor, property, options) {
  return explainPropertyBaseValue(actor, property, options).total
}

export function explainPropertyValue(actor, property, options) {
  const result = explainPropertyBaseValue(actor, property, options)
  const gained = ObjectUtils.try(property, 'gained', { default: [] }).length
  if (gained !== 0) {
    result.total += gained
    result.components.push({ label: 'XP', value: gained })
  }
  const buff = ObjectUtils.try(property, 'buff', { default: 0 })
  if (buff !== 0) {
    result.total += buff
    result.components.push({ label: 'Buff', value: buff })
  }
  const items = actor.equippedItems || []
  for (const item of items) {
    const effects = item.data.effects || []
    const value = effects.filter(e => e.key === property.key).reduce((acc, cur) => acc + (+cur.value), 0)
    if (value !== 0 && !isNaN(value)) {
      result.total += value
      result.components.push({ label: item.name, value })
    }
  }
  return result
}

export function calcUpgradeCost(actor, property, { max } = {}) {
  const baseVal = calcPropertyBaseValue(actor, property)
  const gainLog = ObjectUtils.try(property, 'gained', { default: [] })
  const result = XpTable.getUpgradeCost({
    category: property.tmpXpCategory || property.xpCategory,
    from: baseVal + gainLog.length,
    to: baseVal + gainLog.length + 1,
  })
  if (max != null && result > max) {
    return null
  }
  return result
}

export function calcMaxInventoryWeight(actor) {
  return (attrValue(actor, 'kk') + attrValue(actor, 'ko')) / 2
}

export function explainArmor(equippedItems) {
  const relevantItems = equippedItems.filter(item => item.data.armor != null && item.data.armor !== 0)
  return {
    total: relevantItems.reduce((acc, cur) => acc + cur.data.armor, 0),
    components: relevantItems.map(item => ({ label: item.name, value: item.data.armor }))
  }
}

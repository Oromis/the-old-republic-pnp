import Config from './Config.js'
import ObjectUtils from './ObjectUtils.js'
import Species from './Species.js'
import Attributes, {attrValue} from './Attributes.js'
import XpTable from './XpTable.js'
import Metrics from './Metrics.js'
import Skills from "./Skills.js"

export function detectPropertyType(property) {
  const key = property.key
  if (key.length === 2) {
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
    default:
      throw new Error(`Property type without base value: ${property.key}`)
  }
}

export function calcGp(char) {
  return (char.data.gp.initial || Config.character.initialGp)
    - (char.data.xp.gp || 0)
    - ObjectUtils.try(Species.map[char.data.species], 'gp', { default: 0 })
    - Object.values(char.data.attributes).reduce((acc, cur) => acc + (cur.gp || 0), 0)
    - char.items.filter(i => i.type === 'training').reduce((acc, cur) => acc + (+cur.data.gp), 0)
}

export function calcFreeXp(char) {
  return calcTotalXp(char) -
    Attributes.list.reduce((acc, cur) => {
      return acc + ObjectUtils.try(char.data.attributes, cur.key, 'xp', { default: 0 })
    }, 0) -
    char.items.filter(item => item.type === 'skill').reduce((acc, skill) => acc + calcSkillXp(skill.data), 0) -
    Metrics.list.reduce((acc, cur) => {
      return acc + ObjectUtils.try(char.data.metrics, cur.key, 'xp', { default: 0 })
    }, 0)
}

export function calcTotalXp(char) {
  return char.data.xp.gp * Config.character.gpToXpRate + char.data.xp.gained
}

export function calcSkillXp(skill) {
  let result = skill.xp || 0
  if (!skill.isBasicSkill) {
    // Non-basic skills need to be activated
    result += XpTable.getActivationCost(skill.xpCategory)
  }
  return result
}

function calcXpFromTrainingSkill(training, key, from) {
  if(training.data.baseTraining) {
    from += (+training.data.baseTraining.data.mods[key]) || 0
  }
  return XpTable.getUpgradeCost({
    category: Skills.getMap()[key].xpCategory,
    from: from,
    to: from + (+training.data.mods[key])
  })
}

export function calcPropertyTrainingsMod(actor, property) {
  if(detectPropertyType(property) !== 'skill') {
    return actor.trainings.map(t => ObjectUtils.try(t.data.mods, getKey(property), {default: 0})).reduce((acc, v) => acc + (+v), 0)
  }
  const from = (Skills.getMap()[getKey(property)].isBasicSkill ? 5 : 0) + calcPropertySpeciesMod(actor, property)
  const xp = actor.trainings.map(t => calcXpFromTrainingSkill(t, getKey(property), from)).reduce((acc, v) => acc + (+v), 0)
  return XpTable.getPointsFromXp({
    category: Skills.getMap()[getKey(property)].xpCategory,
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

export function explainMod(actor, property) {
  const components = [
    explainSpeciesMod(actor, property),
    { label: 'Ausbildungen', value: calcPropertyTrainingsMod(actor, property)}
  ].filter(mod => mod.value !== 0)
  return {
    total: components.reduce((acc, cur) => acc + cur.value, 0),
    components
  }
}

export function explainPropertyBaseValue(actor, property, options) {
  const result = explainMod(actor, property)
  const gp = ObjectUtils.try(property, 'gp', { default: 0 })
  if (gp !== 0) {
    result.total += gp
    result.components.unshift({ label: 'GP', value: gp })
  }
  const base = getBaseValue(actor, property, options)
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
    const effects = item.data.effects || {}
    const value = +(effects[property.key] || 0)
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

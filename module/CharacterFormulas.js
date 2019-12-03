import Config from './Config.js'
import ObjectUtils from './ObjectUtils.js'
import Species from './Species.js'
import Attributes from './Attributes.js'
import XpTable from './XpTable.js'
import Metrics from './Metrics.js'

function detectPropertyType(property) {
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
  return (char.gp.initial || Config.character.initialGp)
    - (char.xp.gp || 0)
    - ObjectUtils.try(Species.map[char.species], 'gp', { default: 0 })
    - Object.values(char.attributes).reduce((acc, cur) => acc + (cur.gp || 0), 0)
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

export function explainMod(actor, property) {
  const key = typeof property === 'string' ? property : property.key
  const species = Species.map[(actor.species || Species.default)]
  const components = [
    { label: species.name, value: ObjectUtils.try(species, 'mods', key, { default: 0 }) }
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

export function explainMetricMax(actor, metric) {
  const baseValue = metric.calcBaseValue(actor)
  return {
    total: baseValue,
    components: [
      { label: 'Basis', value: baseValue },
    ]
  }
}

import Config from './Config.js'
import ObjectUtils from './util/ObjectUtils.js'

export function detectPropertyType(property, { throwOnError = true } = {}) {
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
    if (throwOnError) {
      throw new Error(`Unknown property type: ${key}`)
    } else {
      return null
    }
  }
}

function getBaseValue(property, { target = 'value' } = {}) {
  if (typeof property.calcBaseValue === 'function') {
    return property.calcBaseValue({ target })
  }
  switch (detectPropertyType(property)) {
    case 'skill':
      return 5
    case 'resistance':
      return 0
    default:
      throw new Error(`Property type without base value: ${property.key}`)
  }
}

export function calcGp(actor) {
  return (actor.gp.initial || Config.character.initialGp)
    - (actor.xp.gp || 0)
    - ObjectUtils.try(actor.species, 'gp', { default: 0 })
    - actor.attributes.list.reduce((acc, cur) => acc + (cur.gp || 0), 0)
    - actor.trainings.reduce((acc, cur) => acc + (+cur.gp), 0)
}

export function calcFreeXp(actor) {
  return actor.xp.total -
    actor.attributes.list.reduce((acc, cur) => acc + cur.xp || 0, 0) -
    actor.skills.list.reduce((acc, skill) => acc + skill.xp, 0) -
    actor.metrics.list.reduce((acc, cur) => cur.xp || 0, 0)
}

export function calcTotalXp(actor) {
  return actor.xp.gp * Config.character.gpToXpRate + actor.xp.gained
}

export function explainPropertyBaseValue(actor, property, options) {
  const result = actor.modifiers[property.key].explainBonus()
  const gp = ObjectUtils.try(property, 'gp', { default: 0 })
  if (gp !== 0) {
    result.total += gp
    result.components.unshift({ label: 'GP', value: gp })
  }
  let base = getBaseValue(property, options)
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
  for (const xpComponent of actor.modifiers[property.key].explainXp().components) {
    const totalBefore = result.total
    result.total += actor.dataSet.xpTable.getPointsFromXp({
      category: property.effectiveXpCategory,
      xp: xpComponent.value,
      from: totalBefore,
    })
    if (totalBefore !== result.total) {
      result.components.push({ label: xpComponent.label, value: result.total - totalBefore })
    }
  }
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
  const result = actor.dataSet.xpTable.getUpgradeCost({
    category: property.currentXpCategory || property.xpCategory,
    from: baseVal + gainLog.length,
    to: baseVal + gainLog.length + 1,
  })
  if (max != null && result > max) {
    return null
  }
  return result
}

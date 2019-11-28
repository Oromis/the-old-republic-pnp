import Config from './Config.js'
import ObjectUtils from './ObjectUtils.js'
import Species from './Species.js'
import Attributes from './Attributes.js'
import XpTable from './XpTable.js'

export function calcGp(char) {
  return (char.gp.initial || Config.character.initialGp)
    - (char.xp.gp || 0)
    - ObjectUtils.try(Species.map[char.species], 'gp', { default: 0 })
    - Object.values(char.attributes).reduce((acc, cur) => acc + (cur.gp || 0), 0)
}

export function calcFreeXp(char) {
  return calcTotalXp(char) -
    Attributes.list.reduce((acc, cur) => {
      return acc + ObjectUtils.try(char.attributes[cur.key], 'xp', { default: 0 })
    }, 0)
}

export function calcTotalXp(char) {
  return char.xp.gp * Config.character.gpToXpRate + char.xp.gained
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

export function calcMod(actor, property) {
  return explainMod(actor, property).total
}

export function explainAttributeBaseValue(actor, attribute) {
  const gp = ObjectUtils.try(attribute, 'gp', { default: 0 })
  const result = explainMod(actor, attribute)
  if (gp !== 0) {
    result.total += gp
    result.components.unshift({ label: 'GP', value: gp })
  }
  return result
}

export function calcAttributeBaseValue(actor, attribute) {
  return explainAttributeBaseValue(actor, attribute).total
}

export function explainAttributeValue(actor, attribute) {
  const result = explainAttributeBaseValue(actor, attribute)
  const gained = ObjectUtils.try(attribute, 'gained', { default: [] }).length
  if (gained !== 0) {
    result.total += gained
    result.components.push({ label: 'XP', value: gained })
  }
  const buff = ObjectUtils.try(attribute, 'buff', { default: 0 })
  if (buff !== 0) {
    result.total += buff
    result.components.push({ label: 'Buff', value: buff })
  }
  return result
}

export function calcAttributeUpgradeCost(actor, attribute) {
  const baseVal = calcAttributeBaseValue(actor, attribute)
  const gainLog = ObjectUtils.try(attribute, 'gained', { default: [] })
  return XpTable.getUpgradeCost({
    category: ObjectUtils.try(attribute, 'xpCategory', { default: Config.character.attributes.xpCategory }),
    from: baseVal + gainLog.length,
    to: baseVal + gainLog.length + 1,
  })
}

export default {
  calcAttributeUpgradeCost,
  calcAttributeBaseValue,
  calcFreeXp,
  calcGp,
  calcMod,
  calcTotalXp,
  explainAttributeValue,
  explainAttributeBaseValue,
  explainMod
}

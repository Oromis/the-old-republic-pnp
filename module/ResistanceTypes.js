import ObjectUtils from './ObjectUtils.js'

function resistFlat(damage) {
  return { damage: Math.max(0, damage - this.value.total) }
}

function resistEnergy(damage, actor) {
  const EnP = actor.metrics.EnP.value
  const reduced = Math.min(EnP, damage, this.value.total)
  return { damage: damage - reduced, cost: { EnP: reduced }}
}

function resistPercentage(damage) {
  return { damage: damage * Math.max(0, (1 - this.value.total)) }
}

const list = [
  { key: 'shield', label: 'Schild', icon: 'icons/svg/circle.svg', resists: ['energy', 'ion'], resist: resistEnergy },
  { key: 'armor', label: 'Rüstung', icon: 'icons/svg/shield.svg', resists: ['physical', 'energy', 'ion'], resist: resistFlat },
  { key: 'fire', label: 'Feuerresistenz', icon: 'icons/svg/fire-shield.svg', resists: ['fire'], resist: resistPercentage },
  { key: 'poison', label: 'Giftresistenz', icon: 'icons/svg/poison.svg', resists: ['poison'], resist: resistPercentage },
  { key: 'ice', label: 'Eisresistenz', icon: 'icons/svg/ice-shield.svg', resists: ['ice'], resist: resistPercentage },
]

for (const resistanceType of list) {
  resistanceType.canResist = damageType => resistanceType.resists.indexOf(damageType.key) !== -1
}

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

import ObjectUtils from '../util/ObjectUtils.js'
import PropertyPrototype from '../properties/PropertyPrototype.js'
import Property from '../properties/Property.js'
import { explainArmor, explainEffect, explainPropertyValue } from '../CharacterFormulas.js'

function resistFlat(damage) {
  return { damage: Math.max(0, damage - this.value.total) }
}

function resistEnergy(damage, type, actor) {
  const EnP = actor.metrics.EnP.value
  let damageMulti = 1
  if (type.key === 'ion')
    damageMulti = 10

  const reduced = Math.min(EnP, damage * damageMulti, this.value.total)
  return { damage: damage - (reduced / damageMulti), cost: { EnP: reduced }}
}

function resistPercentage(damage) {
  return { damage: damage * Math.max(0, (1 - this.value.total)) }
}

class ResistanceTypeInstance extends Property {
  canResist(damageType) {
    return this._staticData.resists.indexOf(damageType.key) !== -1
  }
}

class ResistanceTypePrototype extends PropertyPrototype {
  constructor(key, staticData) {
    super(key, {
      staticData,
      template: {
        buff: 0,
      },
      updaters: [
        (data, { entity, property }) => {
          if (property.key === 'r_armor') {
            data.value = explainArmor(entity)
          } else {
            data.value = explainPropertyValue(entity, property)
          }
        }
      ],
      PropertyClass: ResistanceTypeInstance,
    })
  }
}

const list = [
  new ResistanceTypePrototype('r_shield',
    { label: 'Schild', icon: 'icons/svg/circle.svg', resists: ['energy', 'ion'], resist: resistEnergy }
  ),
  new ResistanceTypePrototype('r_armor',
    { label: 'Rüstung', icon: 'icons/svg/shield.svg', resists: ['physical', 'energy', 'ion'], resist: resistFlat }
  ),
  new ResistanceTypePrototype('r_fire',
    { label: 'Feuerresistenz', icon: 'icons/svg/fire-shield.svg', resists: ['fire'], resist: resistPercentage }
  ),
  new ResistanceTypePrototype('r_poison',
    { label: 'Giftresistenz', icon: 'icons/svg/poison.svg', resists: ['poison'], resist: resistPercentage }
  ),
  new ResistanceTypePrototype('r_ice',
    { label: 'Eisresistenz', icon: 'icons/svg/ice-shield.svg', resists: ['ice'], resist: resistPercentage }
  ),
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})

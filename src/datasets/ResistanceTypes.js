import ObjectUtils from '../util/ObjectUtils.js'
import PropertyPrototype from '../properties/PropertyPrototype.js'
import Property from '../properties/Property.js'
import { explainPropertyValue } from '../CharacterFormulas.js'
import Config from '../Config.js'

function resistFlat(damage) {
  return { damage: Math.max(0, damage - this.value.total) }
}

function resistForce(damage) {
  if (this.value.total !== 0) {
    // Force shield can take all or nothing. Even if it kills the user.
    const forceCost = Math.round(damage * (0.5 + ((100 - this.value.total) / 100)))
    return { damage: 0, cost: { MaP: forceCost } }
  } else {
    return { damage }
  }
}

function resistEnergy(damage, type, actor) {
  const EnP = actor.metrics.EnP.value
  let damageMulti = 1
  if (type.key === 'ion') {
    damageMulti = 10
  } else if (type.key === 'shock') {
    damageMulti = 4
  }

  const energyCellMode = actor.metrics.EnP.mode || 'discharge'
  let reduced
  if (energyCellMode === 'off') {
    reduced = 0
  } else {
    if (energyCellMode !== 'discharge') {
      // Discharging in charge mode => 75% losses => 4 times the energy usage
      damageMulti *= (1 / Config.energy.wrongModeEfficiency)
    }
    reduced = Math.floor(Math.min(EnP, damage * damageMulti, this.value.total) / damageMulti)
  }
  return { damage: damage - reduced, cost: { EnP: reduced * damageMulti }}
}

function resistPercentage(damage) {
  return { damage: damage * Math.max(0, (1 - this.value.total)) }
}

class ResistanceTypeInstance extends Property {
  canResist(damageType) {
    if (typeof this._staticData.resists === 'boolean') {
      return this._staticData.resists
    } else {
      return this._staticData.resists.indexOf(damageType.key) !== -1
    }
  }

  resist(damage, type) {
    return this._staticData.resist.call(this, damage, type, this._entity)
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
          data.value = explainPropertyValue(entity, property)
        }
      ],
      PropertyClass: ResistanceTypeInstance,
    })
  }
}

const list = [
  new ResistanceTypePrototype('r_force',
    { label: 'Machtschild', icon: 'icons/svg/circle.svg', resists: true, resist: resistForce }
  ),
  new ResistanceTypePrototype('r_shield',
    { label: 'Schild', icon: 'icons/svg/circle.svg', resists: ['energy', 'ion', 'shock'], resist: resistEnergy }
  ),
  new ResistanceTypePrototype('r_armor',
    { label: 'Rüstung', icon: 'icons/svg/shield.svg', resists: ['physical', 'energy', 'ion', 'stamina'], resist: resistFlat }
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

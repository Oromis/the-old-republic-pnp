import Config from '../Config.js'
import ObjectUtils from '../util/ObjectUtils.js'
import {attrValue} from './HumanoidAttributes.js'
import PropertyPrototype from '../properties/PropertyPrototype.js'
import { calcUpgradeCost, explainEffect, explainPropertyValue } from '../CharacterFormulas.js'
import Property from '../properties/Property.js'

class HumanoidMetric extends Property {
  calcBaseValue({ target = 'value' } = {}) {
    return target === 'value' ? 5 : this._staticData.calcBaseValue(this._entity)
  }

  get costOptions() {
    return [this.key, ...(this.fallbackCostOptions || [])]
  }

  get upgradeCost() {
    return calcUpgradeCost(this._entity, this, { max: this._entity.xp.free })
  }
}

class HumanoidMetricsPrototype extends PropertyPrototype {
  constructor(key, staticData) {
    super(key, {
      staticData,
      template: {
        xp: 0,
        gp: 0,
        gained: [],
        buff: 0,
      },
      updaters: [
        (data, { entity, property }) => {
          data.mod = explainEffect(entity, property)
          const maxExplanation = explainPropertyValue(entity, property, { target: 'max' })
          data.max = maxExplanation.total
          data.maxComponents = maxExplanation.components
          data.missing = data.max - data.value
        }
      ],
      PropertyClass: HumanoidMetric,
    })
  }
}

const LeP = new HumanoidMetricsPrototype('LeP', {
  label: 'Lebenspunkte',
  desc: 'Repräsentiert den körperlichen Gesundheitszustand',
  xpCategory: Config.character.LeP.xpCategory,
  backgroundColor: '#ffaaaa',
  calcBaseValue(actor) {
    return Math.round((attrValue(actor, 'ko') * 2 + attrValue(actor, 'kk')) / 3)
  }
})
const AuP = new HumanoidMetricsPrototype('AuP', {
  label: 'Ausdauerpunkte',
  desc: 'Misst den körperlichen und geistigen Erschöpfungsgrad',
  xpCategory: Config.character.AuP.xpCategory,
  backgroundColor: '#aaffaa',
  calcBaseValue(actor) {
    return Math.round((attrValue(actor, 'ko') + attrValue(actor, 'kk') + attrValue(actor, 'wk')) * 0.66)
  }
})
const MaP = new HumanoidMetricsPrototype('MaP', {
  label: 'Machtpunkte',
  desc: 'Ein Maß für die Menge an Macht-Kräften, die zur Verfügung stehen',
  xpCategory: Config.character.MaP.xpCategory,
  backgroundColor: '#e3caff',
  fallbackCostOptions: [AuP.key, LeP.key],  // If the force user is out of MaP, costs will be paid in AuP and then LeP
  calcBaseValue(actor) {
    return Math.round((attrValue(actor, 'ch') + attrValue(actor, 'in') + attrValue(actor, 'kl') + attrValue(actor, 'wk')) / 2)
  }
})
const EnP = new HumanoidMetricsPrototype('EnP', {
  label: 'Energiepunkte',
  desc: 'Steht für den Ladezustand der Akkus',
  backgroundColor: '#c7d6ff',
  calcBaseValue() {
    return 0 // Energy pool is governed by equipment alone
  }
})

const list = [LeP, AuP, MaP, EnP]
const map = ObjectUtils.asObject(list, 'key')
export default Object.freeze({ list, map })

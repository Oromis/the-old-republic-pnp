import Config from '../Config.js'
import ObjectUtils from '../util/ObjectUtils.js'
import { calcUpgradeCost } from '../CharacterFormulas.js'
import Metric from '../properties/Metric.js'
import MetricPrototype from '../properties/MetricPrototype.js'

class HumanoidMetric extends Metric {
  get upgradeCost() {
    return calcUpgradeCost(this._entity, this, { max: this._entity.xp.free })
  }

  get currentXpCategory() {
    return this.xpCategory || this.effectiveXpCategory
  }

  get effectiveXpCategory() {
    return this.entity.dataSet.xpTable.modifyCategory(
      this._staticData.xpCategory,
      this.entity.modifiers[this.key].xpCategoryBonus
    )
  }

  get canBuyPoints() {
    return this._staticData.xpCategory != null
  }
}

class HumanoidEnergyMetric extends HumanoidMetric {
  get mode() {
    return this._data.mode || 'discharge'
  }
}

class HumanoidMetricPrototype extends MetricPrototype {
  constructor(key, staticData, PropertyClass = HumanoidMetric) {
    super(key, {
      staticData,
      template: {
        xp: 0,
        gp: 0,
        gained: [],
        buff: 0,
      },
      PropertyClass,
    })
  }
}

const LeP = new HumanoidMetricPrototype('LeP', {
  label: 'Lebenspunkte',
  desc: 'Repräsentiert den körperlichen Gesundheitszustand',
  xpCategory: Config.character.LeP.xpCategory,
  backgroundColor: '#ffaaaa',
  regen: {
    day() { return this.calcBaseValue({ target: 'max' }) / 4 },
  },
  calcBaseValue(actor) {
    return Math.round((actor.attrValue('ko') * 2 + actor.attrValue('kk')) / 3)
  }
})
const AuP = new HumanoidMetricPrototype('AuP', {
  label: 'Ausdauerpunkte',
  desc: 'Misst den körperlichen und geistigen Erschöpfungsgrad',
  xpCategory: Config.character.AuP.xpCategory,
  backgroundColor: '#aaffaa',
  regen: {
    day: 'missing',
    turn: 1,
  },
  calcBaseValue(actor) {
    return Math.round((actor.attrValue('ko') + actor.attrValue('kk') + actor.attrValue('wk')) * 0.66)
  }
})
const MaP = new HumanoidMetricPrototype('MaP', {
  label: 'Machtpunkte',
  desc: 'Ein Maß für die Menge an Macht-Kräften, die zur Verfügung stehen',
  xpCategory: Config.character.MaP.xpCategory,
  backgroundColor: '#e3caff',
  fallbackCostOptions: [AuP.key, LeP.key],  // If the force user is out of MaP, costs will be paid in AuP and then LeP
  regen: {
    day: 'missing',
    turn: 2,
  },
  calcBaseValue(actor) {
    return Math.round((actor.modifiers.McL.bonus / 10000) * (actor.attrValue('ch') + actor.attrValue('in') + actor.attrValue('kl') + actor.attrValue('wk')) / 2)
  }
})
const EnP = new HumanoidMetricPrototype('EnP', {
  label: 'Energiepunkte',
  desc: 'Steht für den Ladezustand der Akkus',
  backgroundColor: '#c7d6ff',
  regen: {
    day: 'missing',
    turn(actor) {
      // Energy regeneration is governed by items through the "EgL" effect (Energiegenerator-Leistung)
      return actor.modifiers.EgL.bonus
    },
  },
  calcDeltaFactor(delta) {
    if (this.mode === 'off') {
      return 0
    } else if (delta > 0 && this.mode !== 'charge') {
      return Config.energy.wrongModeEfficiency
    } else if (delta < 0 && this.mode !== 'discharge') {
      return 1 / Config.energy.wrongModeEfficiency
    } else {
      return 1
    }
  },
  calcBaseValue() {
    return 0 // Energy pool is governed by equipment alone
  }
}, HumanoidEnergyMetric)

const list = [LeP, AuP, MaP, EnP]
const map = ObjectUtils.asObject(list, 'key')
export default Object.freeze({ list, map })

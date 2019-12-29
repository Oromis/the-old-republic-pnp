import { defineGetter, evalSkillExpression } from '../util/EntityUtils.js'
import ObjectUtils from '../util/ObjectUtils.js'
import { roundDecimal } from '../util/MathUtils.js'

const distanceVariableNames = ['Entfernung', 'entfernung', 'Distanz', 'distanz', 'Distance', 'distance']

export default {
  beforeConstruct() {
    defineGetter(this, 'currentPrecision', function () {
      return -evalSkillExpression(
        ObjectUtils.try(this.data.data.precision, 'formula'),
        this.skill,
        { vars: ObjectUtils.sameValue(this.actor.targetDistance, ...distanceVariableNames), round: 0 }
      ).value
    })

    defineGetter(this, 'currentProjectileEnergy', function () {
      return Math.max(roundDecimal(evalSkillExpression(
        ObjectUtils.try(this.data.data.projectileEnergy, 'formula'),
        this.skill,
        { vars: ObjectUtils.sameValue(this.actor.targetDistance, ...distanceVariableNames) }
      ).value, 3), 0)
    })

    defineGetter(this, 'attackAdvantage', function () {
      return this.currentPrecision +
        this.calcBaseAttackAdvantage()
    })
  }
}

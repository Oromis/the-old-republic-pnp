import {defineGetter, evalSkillExpression, replaceFunction} from '../util/EntityUtils.js'
import ObjectUtils from '../util/ObjectUtils.js'
import { roundDecimal } from '../util/MathUtils.js'
import ExplanationUtils from '../util/ExplanationUtils.js'

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

    replaceFunction(this, 'explainAttackAdvantage', function ({ original }) {
      const result = original.call(this)
      ExplanationUtils.add(result, { label: 'Präzision', value: this.currentPrecision })
      return result
    })
  }
}

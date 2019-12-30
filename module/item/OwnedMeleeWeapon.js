import { defineGetter } from '../util/EntityUtils.js'
import { roundDecimal } from '../util/MathUtils.js'

export default {
  beforeConstruct() {
    defineGetter(this, 'currentStrengthModifier', function () {
      return roundDecimal((this.actor.attrValue('kk') + 50) / 100, 2)
    })

    defineGetter(this, 'canDefend', function () { return true })

    defineGetter(this, 'paradeCheck', function () {
      if (this.skill == null) {
        return null
      }
      const paradeAdvantage = this.getBaseParadeAdvantage()
      const result = this.skill.check
      for (const roll of result.rolls) {
        roll.advantage = paradeAdvantage
      }
      return result
    })

    this.getBaseParadeAdvantage = function () {
      const primarySlot = this.primaryEquippedSlot
      return ((primarySlot && primarySlot.coordination) || 0) +
        (this.data.data.paradeAdvantage || 0)
    }
  }
}

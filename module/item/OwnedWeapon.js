import { defineGetter } from '../util/EntityUtils.js'
import ObjectUtils from '../util/ObjectUtils.js'

export default {
  beforeConstruct() {
    defineGetter(this, 'skill', function () {
      const key = this.data.data.skill
      if (key) {
        // Try to find the actor's corresponding skill
        return this.actor.skills[key]
      } else {
        return null
      }
    })

    this.calcBaseAttackAdvantage = () => {
      const primarySlot = this.primaryEquippedSlot
      return ((primarySlot && primarySlot.coordination) || 0) +
        this.data.data.attackAdvantage || 0
    }

    defineGetter(this, 'attackAdvantage', this.calcBaseAttackAdvantage, { configurable: true })

    defineGetter(this, 'attackCheck', function () {
      if (this.skill == null) {
        return null
      }
      const attackAdvantage = this.attackAdvantage
      const result = this.skill.check
      for (const roll of result.rolls) {
        roll.advantage = attackAdvantage
      }
      return result
    })
  }
}

import { defineEnumAccessor, defineGetter } from '../util/EntityUtils.js'
import ObjectUtils from '../util/ObjectUtils.js'
import RollUtils from '../util/RollUtils.js'

export default {
  beforeConstruct() {
    defineEnumAccessor(this, 'damageType')

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
        (this.data.data.attackAdvantage || 0)
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

    defineGetter(this, 'currentDamageFormula', function () {
      let result = this.damage.formula
      const projectileEnergy = this.currentProjectileEnergy
      if (!isNaN(projectileEnergy) && projectileEnergy !== 1) {
        result = `(${result})*${projectileEnergy}`
      }
      const strengthModifier = this.currentStrengthModifier
      if (!isNaN(strengthModifier) && strengthModifier !== 1) {
        result = `(${result}*${strengthModifier})`
      }
      return result
    })

    this.rollAttack = function rollAttack() {
      const promises = [
        RollUtils.rollCheck(this.attackCheck, {
          actor: this.actor.id,
          label: `Attacke ${this.primaryEquippedSlot.label} (${this.name})`
        }),
      ]
      if (this.energyCost) {
        promises.push(this.actor.modifyMetrics(this.actor.calculateMetricsCosts({ EnP: this.energyCost })))
      }
      return Promise.all(promises)
    }

    this.rollParade = function rollParade() {
      return RollUtils.rollCheck(this.paradeCheck, {
        actor: this.actor.id,
        label: `Parade ${this.primaryEquippedSlot.label} (${this.name})`
      })
    }

    this.rollDamage = function rollDamage() {
      return RollUtils.rollFormula(this.currentDamageFormula, {
        actor: this.actor.id,
        label: `Schaden ${this.primaryEquippedSlot.label} (${this.name})`
      })
    }
  }
}

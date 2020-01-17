import { defineEnumAccessor, defineGetter } from '../util/EntityUtils.js'
import ObjectUtils from '../util/ObjectUtils.js'
import RollUtils from '../util/RollUtils.js'
import Config from '../Config.js'
import {roundDecimal} from '../util/MathUtils.js'

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
      return ((primarySlot && primarySlot.explainCoordination(this.actor).total) || 0) +
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
      result.calcEffectiveness = true
      result.criticalBonus = Config.combat.criticalBonus
      result.weapon = {
        name: this.name,
        img: this.img,
        burstSize: this.burstSize
      }
      result.tags = ['attack', this.itemType.isRangedWeapon ? 'ranged' : 'melee']
      return result
    })

    defineGetter(this, 'paradeCheck', function () {
      // If we use a weapon that is not fit for defense (such as using a blaster gun to parry a vibro blade), then
      // the relevant skill is "Hand-to-hand" instead of the weapon skill
      const skill = this.canDefend ? this.skill : this.actor.getFallbackCombatSkill()
      if (skill == null) {
        return null
      }

      const paradeAdvantage = this.calcBaseParadeAdvantage()
      const result = skill.check
      for (const roll of result.rolls) {
        roll.advantage = paradeAdvantage
      }
      result.calcEffectiveness = true
      result.criticalBonus = Config.combat.criticalBonus
      result.effectivenessBonus = this.actor.defenseEffectivenessBonus || 0
      result.tags = ['defense']
      return result
    })

    this.calcBaseParadeAdvantage = function () {
      const primarySlot = this.primaryEquippedSlot
      return ((primarySlot && primarySlot.explainCoordination(this.actor).total) || 0) +
        (this.data.data.paradeAdvantage || 0)
    }

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
      if (this.condition < 100) {
        result = `(${result}*${roundDecimal(this.condition / 100, 2)})`
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

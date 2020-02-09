import { defineGetter } from '../util/EntityUtils.js'
import RollUtils from '../util/RollUtils.js'
import Config from '../Config.js'
import {roundDecimal} from '../util/MathUtils.js'
import ExplanationUtils from '../util/ExplanationUtils.js'

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

    this.explainAttackAdvantage = () => {
      const result = { total: 0, components: [] }
      const primarySlot = this.primaryEquippedSlot
      const coordination = (primarySlot && primarySlot.explainCoordination(this.actor).total) || 0
      ExplanationUtils.add(result, { label: 'Koordination', value: coordination })
      ExplanationUtils.add(result, { label: 'Manuelle Erleichterung', value: this.data.data.attackAdvantage })
      ExplanationUtils.join(result, this.actor.modifiers.ElA.explainBonus())
      return result
    }

    defineGetter(this, 'attackAdvantageExplanation', function () {
      return this.explainAttackAdvantage()
    }, { configurable: true })

    defineGetter(this, 'attackAdvantage', function () {
      return this.explainAttackAdvantage().total
    }, { configurable: true })

    defineGetter(this, 'attackCheck', function () {
      if (this.skill == null) {
        return null
      }
      const advantageExplanation = this.explainAttackAdvantage()
      const attackAdvantage = advantageExplanation.total
      const result = this.skill.check
      for (const roll of result.rolls) {
        roll.advantage = attackAdvantage
      }
      result.calcEffectiveness = true
      result.criticalBonus = Config.combat.criticalBonus
      result.advantageExplanation = advantageExplanation
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

      const advantageExplanation = this.explainParadeAdvantage()
      const result = skill.check
      for (const roll of result.rolls) {
        roll.advantage = advantageExplanation.total
      }
      result.calcEffectiveness = true
      result.criticalBonus = Config.combat.criticalBonus
      result.advantageExplanation = advantageExplanation
      result.effectivenessBonus = this.actor.defenseEffectivenessBonus || 0
      result.tags = ['defense']
      return this.actor.processDefenseCheck(result, { defenseType: 'parade' })
    })

    this.explainParadeAdvantage = function () {
      const result = { total: 0, components: [] }
      const primarySlot = this.primaryEquippedSlot
      const coordination = (primarySlot && primarySlot.explainCoordination(this.actor).total) || 0
      ExplanationUtils.add(result, { label: 'Koordination', value: coordination })
      ExplanationUtils.add(result, { label: 'Manuelle Erleichterung', value: this.data.data.paradeAdvantage })
      ExplanationUtils.join(result, this.actor.modifiers.ElD.explainBonus())
      ExplanationUtils.join(result, this.actor.modifiers.ElP.explainBonus())
      return result
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

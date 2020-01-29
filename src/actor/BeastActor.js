import Config from '../Config.js'
import {
  defineCachedGetter,
  defineGetter,
  explainComputedValue
} from '../util/EntityUtils.js'
import { roundDecimal } from '../util/MathUtils.js'
import RollUtils from '../util/RollUtils.js'
import CombatAction from '../item/CombatAction.js'
import ExplanationUtils from '../util/ExplanationUtils.js'

/**
 * Functionality for beasts. Beasts are always NPCs and use a different (simplified) charsheet
 */
export default {
  beforeConstruct() {
    Object.defineProperty(this, 'defenseEffectivenessBonus', {
      enumerable: true,
      get() {
        return this.data.data.defenseEffectivenessBonus
      },
      set(newValue) {
        return this.update({ 'data.defenseEffectivenessBonus': newValue })
      }
    })

    defineCachedGetter(this, 'baseInitiativeExplanation', () => explainComputedValue({
      value: roundDecimal((this.attrValue('in') + this.attrValue('sc')) / 5, 2),
      label: `Attribute (IN+SC)/5`,
      bonusExplanation: this.modifiers.InI.explainBonus(),
    }))

    defineCachedGetter(this, 'speed1Explanation', () => {
      const result = explainComputedValue({
        value: roundDecimal(this.attrValue('sc') / 12, 2),
        label: `Sprintstärke (SC/12)`,
        bonusExplanation: this.modifiers.LaW.explainBonus(),
      })
      result.total += 2
      result.components.unshift({ label: 'Basis', value: 2 })
      return result
    })

    defineCachedGetter(this, 'speed2Explanation', () => {
      const result = explainComputedValue({
        value: roundDecimal((this.attrValue('sc') / 12) * (this.attrValue('ko') / 100), 2),
        label: `Ausdauer (SC/12)*(KO/100)`,
        bonusExplanation: this.modifiers.LaW.explainBonus(),
      })
      result.total += 2
      result.components.unshift({ label: 'Basis', value: 2 })
      return result
    })

    defineCachedGetter(this, 'encumberanceExplanation', () => {
      const result = {
        total: 0,
        components: [],
      }

      // Encumberance from low life
      const lifePercentage = this.metrics.LeP.value / this.metrics.LeP.max
      if (lifePercentage < 0.3) {
        const encumberance = Math.ceil((((0.3 - lifePercentage) * (10/3)) ** 2) * 10)
        result.total += encumberance
        result.components.push({ label: 'Gesundheitszustand', value: encumberance })
      }

      // Encumberance from low stamina
      const staminaPercentage = this.metrics.AuP.value / this.metrics.AuP.max
      if (staminaPercentage < 0.3) {
        const encumberance = Math.ceil((((0.3 - staminaPercentage) * (10/3)) ** 2) * 5)
        result.total += encumberance
        result.components.push({ label: 'Erschöpfung', value: encumberance })
      }

      // Encumberance from armor & carried items
      for (const item of this.equippedItems) {
        if (item.encumberance) {
          result.total += item.encumberance
          result.components.push({ label: item.name, value: item.encumberance })
        }
      }

      return result
    })

    defineGetter(this, 'encumberance', function () {
      return this.encumberanceExplanation.total
    })

    this.explainEvasionAdvantage = function () {
      const result = { total: 0, components: [] }
      ExplanationUtils.join(result, this.modifiers.ElD.explainBonus())
      return result
    }

    defineGetter(this, 'evasionCheck', function () {
      const evasion = this.skills.aus
      if (evasion) {
        const check = evasion.check
        const advantageExplanation = this.explainEvasionAdvantage()
        for (const roll of check.rolls) {
          roll.advantage = (roll.advantage || 0) + advantageExplanation.total
        }
        check.calcEffectiveness = true
        check.advantageExplanation = advantageExplanation
        check.criticalBonus = Config.combat.criticalBonus
        check.tags = ['defense']
        return this.processDefenseCheck(check)
      } else {
        return null
      }
    })

    this.rollEvasion = function rollEvasion() {
      return RollUtils.rollCheck(this.evasionCheck, {
        actor: this.id,
        label: this.skills.aus.name,
      })
    }

    this._getMaxInventoryWeight = function () {
      return (this.attrValue('kk', { prop: 'permanentValue' }) + this.attrValue('ko', { prop: 'permanentValue' })) / 2
    }

    this.processDefenseCheck = function processDefenseCheck(check, { defenseType = 'evasion' } = {}) {
      if (game.combats.active != null) {
        const combatAction = CombatAction.getSync(game.combats.active.id)
        if (combatAction != null) {
          const attack = combatAction.getNextUnhandledAttack()
          if (attack != null) {
            const isMeleeAttack = combatAction.isMeleeAttack(attack)
            const advantageChanges = { total: 0, components: [] }
            if (isMeleeAttack) {
              // Defense against melee attack
              ExplanationUtils.join(advantageChanges, this.modifiers.ElD_N.explainBonus())
              if (defenseType === 'parade') {
                ExplanationUtils.join(advantageChanges, this.modifiers.ElP_N.explainBonus())
              }
            } else {
              // Defense against ranged attack
              check.effectivenessBonus = (check.effectivenessBonus || 0) - Config.combat.defenseEffectivenessPenalty.rangedFlat
              ExplanationUtils.join(advantageChanges, this.modifiers.ElD_F.explainBonus())
              if (defenseType === 'parade') {
                ExplanationUtils.join(advantageChanges, this.modifiers.ElP_F.explainBonus())
              }
            }
            if (advantageChanges.total !== 0) {
              for (const roll of check.rolls) {
                roll.advantage = (roll.advantage || 0) + advantageChanges.total
              }
              if (check.advantageExplanation != null) {
                ExplanationUtils.join(check.advantageExplanation, advantageChanges)
              } else {
                check.advantageExplanation = advantageChanges
              }
            }
          }
        }
      }
      return check
    }
  },

  afterPrepareData(actorData) {
    actorData.data.initiativeFormula = `${this.baseInitiativeExplanation.total} + 1d12`
  },

  enterTurn(payload) {
    if (this.defenseEffectivenessBonus !== 0) {
      payload['data.defenseEffectivenessBonus'] = 0
    }
  },
}

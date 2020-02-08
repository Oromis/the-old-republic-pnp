import { calcFreeXp, calcGp, calcTotalXp } from '../CharacterFormulas.js'
import Config from '../Config.js'
import {
  defineCachedGetter,
  defineEnumAccessor,
  defineGetter,
  explainComputedValue
} from '../util/EntityUtils.js'
import SwTorItem from '../item/SwTorItem.js'
import { roundDecimal } from '../util/MathUtils.js'
import { STAGE_PERMANENT } from '../util/Modifier.js'
import RollUtils from '../util/RollUtils.js'
import CombatAction from '../item/CombatAction.js'
import ExplanationUtils from '../util/ExplanationUtils.js'

/**
 * Functionality for humanoid characters. "humanoid" refers to intelligent life forms, it has
 * nothing to do with physical properties. E.g. an insectoid species like the Geonosians would be
 * classified as humanoid too.
 *
 * This is a mixin src. It's method will be called at the corresponding points in the actor's
 * lifecycle. `this` refers to the actor.
 *
 * This is done instead of an inheritance relationship because FoundryVTT doesn't support different
 * actor classes for different actor types (yet).
 */
export default {
  beforeConstruct() {
    defineEnumAccessor(this, 'species', { dataSetKey: 'species' })
    defineEnumAccessor(this, 'disposition')
    defineEnumAccessor(this, 'faction')

    const actor = this
    defineGetter(this, 'gp', function () {
      return {
        ...this.data.data.gp,
        get value() {
          return actor._cache.lookup('currentGp', () => calcGp(actor))
        }
      }
    })

    defineGetter(this, 'xp', function () {
      return {
        ...this.data.data.xp,
        get total() {
          return actor._cache.lookup('totalXp', () => calcTotalXp(actor))
        },
        get free() {
          return actor._cache.lookup('freeXp', () => calcFreeXp(actor))
        }
      }
    })

    defineGetter(this, 'xpFromGp', function () {
      return this.xp.gp * Config.character.gpToXpRate
    })

    Object.defineProperty(this, 'defenseEffectivenessBonus', {
      enumerable: true,
      get() {
        return this.data.data.defenseEffectivenessBonus
      },
      set(newValue) {
        return this.update({ 'data.defenseEffectivenessBonus': newValue })
      }
    })

    this._getEmptySlotWeapon = function _getEmptySlotWeapon(slotKey) {
      const skillRating = this.skillValue('fau')
      return new SwTorItem({
        data: {
          skill: 'fau',
          damage: {
            formula: `${skillRating / 5}+${skillRating >= 50 ? 2 : 1}d6`
          },
          damageType: 'stamina',
          hasStrengthModifier: true,
          slots: [slotKey],
        },
        type: 'melee-weapon',
        name: 'Faust',
        img: 'systems/sw-tor/icons/ui/fist-raised-solid.svg',
      }, { actor: this, temporary: true })
    }

    const superCalcModifiers = this._calcModifiers
    this._calcModifiers = function _calcModifiers() {
      const result = superCalcModifiers.call(this)

      // The actor's species can give modifiers
      if (this.species != null) {
        for (const [key, value] of Object.entries(this.species.mods || {})) {
          result.getModifier(key).inject(value, { label: this.species.name, stage: STAGE_PERMANENT })
        }
      }

      return result
    }

    this.getFallbackCombatSkill = function getFallbackCombatSkill() {
      return this.skills.fau
    }

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

      // Encumberance from inventory weight
      if (this.weight.isOverloaded) {
        const encumberance = Math.ceil(((this.weight.value / this.weight.max) - 1) * 10)
        result.total += encumberance
        result.components.push({ label: 'Überladung', value: encumberance })
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

    this._getBar2Metric = function () {
      if (this.metrics.MaP.max > 0) {
        return 'MaP'
      } else if (this.metrics.EnP.max > 0) {
        return 'EnP'
      } else {
        return 'AuP'
      }
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

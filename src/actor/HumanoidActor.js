import { calcFreeXp, calcGp, calcTotalXp } from '../CharacterFormulas.js'
import Config from '../Config.js'
import {
  defineCachedGetter,
  defineDataAccessor,
  defineEnumAccessor,
  defineGetter,
  explainComputedValue
} from '../util/EntityUtils.js'
import SwTorItem from '../item/SwTorItem.js'
import { roundDecimal } from '../util/MathUtils.js'
import { STAGE_PERMANENT } from '../util/Modifier.js'

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

    /**
     * Given a cost object of the form { <metric-key>: <cost|number> }, calculates an object containing the actual
     * values being deducted from the actor's metrics if they need to be paid at the current point in time.
     * Doesn't actually pay these costs, it just computes the effect it would have on the actor.
     * @param costs {object} The costs object
     * @returns {object} A diff of the actor's metrics
     */
    this.calculateMetricsCosts = function calculateMetricsCosts(costs) {
      const result = {}
      for (const key of Object.keys(costs)) {
        const metric = this.metrics[key]
        if (metric != null) {
          const costOptions = metric.costOptions
          let costAmount = costs[key]
          for (let i = 0; i < costOptions.length; ++i) {
            const costKey = costOptions[i]

            const previouslyDeducted = -(result[costKey] || 0)
            const available = this.metrics[costKey].value - previouslyDeducted
            let toDeduct = costAmount

            if (available < toDeduct && i < costOptions.length - 1) {
              // Costs can be paid via a different metric
              toDeduct = available
            }

            costAmount -= toDeduct
            if (toDeduct > 0) {
              result[costKey] = -(previouslyDeducted + toDeduct)
            }

            if (costAmount === 0) {
              break
            }
          }
        }
      }
      return result
    }

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
        name: 'Faust'
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

    defineCachedGetter(this, 'baseInitiativeExplanation', () => explainComputedValue({
      value: roundDecimal((this.attrValue('in') + this.attrValue('sc')) / 5, 2),
      label: `Attribute (IN+SC)/5`,
      bonusExplanation: this.modifiers.InI.explainBonus(),
    }))

    defineCachedGetter(this, 'speed1Explanation', () => {
      const result = explainComputedValue({
        value: roundDecimal(this.attrValue('sc') / 10, 2),
        label: `Sprintstärke (SC/10)`,
        bonusExplanation: this.modifiers.LaW.explainBonus(),
      })
      result.total += 2
      result.components.unshift({ label: 'Basis', value: 2 })
      return result
    })

    defineCachedGetter(this, 'speed2Explanation', () => {
      const result = explainComputedValue({
        value: roundDecimal((this.attrValue('sc') / 10) * (this.attrValue('ko') / 100), 2),
        label: `Ausdauer (SC/10)*(KO/100)`,
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
  },

  afterPrepareData(actorData) {
    actorData.data.initiativeFormula = `${this.baseInitiativeExplanation.total} + 1d12`
  }
}


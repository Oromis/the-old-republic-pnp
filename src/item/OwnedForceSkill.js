import { defineGetter, evalSkillExpression } from '../util/EntityUtils.js'
import ObjectUtils from '../util/ObjectUtils.js'

function evalForceSkillCost(skill, costData) {
  return evalSkillExpression(costData.formula, skill, { vars: costData.vars, round: 0 })
}

export default {
  beforeConstruct() {
    defineGetter(this, 'cost', function () {
      const result = {}
      if (this.duration.hasOneTimeCost) {
        defineGetter(result, 'oneTime', () => this._cache.lookup('oneTimeCost', () => {
          const evaluationResult = evalForceSkillCost(this, this.data.data.cost.oneTime)
          return Object.assign(
            { key: 'oneTime', diff: { MaP: evaluationResult.value } },
            this.data.data.cost.oneTime,
            evaluationResult
          )
        }))
      }
      if (this.duration.hasPerTurnCost) {
        defineGetter(result, 'perTurn', () => this._cache.lookup('perTurnCost', () => {
          const evaluationResult = evalForceSkillCost(this, this.data.data.cost.perTurn)
          return Object.assign(
            { key: 'perTurn', diff: { MaP: evaluationResult.value }, postfix: 'pro Runde' },
            this.data.data.cost.perTurn,
            evaluationResult
          )
        }))
      }
      return result
    })

    defineGetter(this, 'costs', function () {
      const cost = this.cost
      return [
        cost.oneTime,
        cost.perTurn,
      ].filter(ObjectUtils.validObjectsFilter)
    })

    defineGetter(this, 'effect', function () {
      return this._cache.lookup('effect', () => {
        const effectModifier = this.data.data.effect.modifier
        return {
          ...this.data.data.effect,
          prefix: effectModifier ? this.dataSet.effectModifiers.map[effectModifier].label : null,
          ...evalSkillExpression(this.data.data.effect.formula, this, { round: 0 }),
          d6: +ObjectUtils.try(this.data.data.effect, 'd6', { default: 0 }),
        }
      })
    })

    // "Casts" the force skill, deducting initial costs and activating any permanent effects
    this.apply = async function apply() {
      if (this.duration.hasOneTimeCost) {
        await this.actor.modifyMetrics(this.actor.calculateMetricsCosts(this.cost.oneTime.diff))
      }
      const userEffect = ObjectUtils.try(this.data.data.activeEffects, 'onUser')
      if (userEffect != null) {
        const effect = game.items.get(userEffect)
        if (effect != null) {
          await this.actor.createEmbeddedEntity('OwnedItem', effect.data)
        } else {
          ui.notifications.error(`Aktiver Effekt ${this.data.data.activeEffects.onUser} nicht gefunden!`)
        }
      }
    }
  }
}

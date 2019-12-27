import { calcFreeXp, calcGp, calcTotalXp } from '../CharacterFormulas.js'
import Config from '../Config.js'
import { defineDataAccessor, defineEnumAccessor, defineGetter } from '../util/EntityUtils.js'

/**
 * Functionality for humanoid characters. "humanoid" refers to intelligent life forms, it has
 * nothing to do with physical properties. E.g. an insectoid species like the Geonosians would be
 * classified as humanoid too.
 *
 * This is a mixin module. It's method will be called at the corresponding points in the actor's
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

    /**
     * Changes the actor's metrics' values by the diff provided.
     */
    this.modifyMetrics = function modifyMetrics(diff) {
      const metrics = {}
      for (const [key, val] of Object.entries(diff)) {
        if (this.metrics[key] != null && typeof this.metrics[key].value === 'number') {
          metrics[key] = { value: this.metrics[key].value + val }
        }
      }
      this.update({ data: { metrics } })
    }
  },
}


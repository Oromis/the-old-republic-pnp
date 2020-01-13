import Property from './Property.js'
import {explainPropertyValue} from '../CharacterFormulas.js'

export default class Metric extends Property {
  calcBaseValue({ target = 'value' } = {}) {
    return target === 'value' ? 5 : this._staticData.calcBaseValue(this._entity)
  }

  /**
   * Returns a list of metric keys points will be deducted from when this Metric needs to pay costs.
   * Usually, this list starts with the key of the current metric to signal that removing LeP will actually
   * remove LeP and not something else. Sometimes this list can have multiple keys though: If it has multiple
   * keys and the first metric doesn't have enough points (would become negative), then points are deducted from the
   * second metric and so on. The last metric always gets the remaining points deducted, even if it does become
   * negative.
   * @return {Array<String>} The list of metric keys to deduct costs from
   */
  get costOptions() {
    return [this.key, ...(this.fallbackCostOptions || [])]
  }

  getRegeneration(type) {
    const regen = this._staticData.regen[type]
    if (regen == null) {
      return 0  // No regeneration for this type
    } else {
      if (typeof regen === 'number') {
        return regen
      } else if (regen === 'missing') {
        return this.missing
      } else if (typeof regen === 'function') {
        return regen.call(this, this._entity)
      } else {
        throw new Error(`Unknown regeneration type ${regen}`)
      }
    }
  }

  calcDeltaFactor(delta) {
    if (typeof this._staticData.calcDeltaFactor === 'function') {
      return this._staticData.calcDeltaFactor.call(this, delta)
    }
  }

  getModifiedValue(delta) {
    let deltaFactor = 1
    if (typeof this._staticData.calcDeltaFactor === 'function') {
      deltaFactor = this._staticData.calcDeltaFactor.call(this, delta)
    }
    return this.value + (delta * deltaFactor)
  }

  get maxExplanation() {
    return explainPropertyValue(this.entity, this, { target: 'max' })
  }

  get max() {
    return this.maxExplanation.total
  }
}

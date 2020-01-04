import ObjectUtils from './ObjectUtils.js'

export default class Modifier {
  constructor(key) {
    this._key = key
    this._aspects = {
      bonus: { total: 0, components: [] },
      xp: { total: 0, components: [], activationPaid: false },
    }
  }

  get key() { return this._key }

  /**
   * Changes the modifier using the provided arguments. All calls to apply() after this will respect these changes.
   * @param input The changes to make to the modifier. Depending on the input's type, different things happen.
   *    At the moment, only numeric inputs are supported, which will be interpreted as a bonus
   *    (or malus if negative).
   * @param label {string} The string to attach to the modifier
   */
  inject(input, { label }) {
    if (typeof input === 'number' || (typeof input === 'string' && !isNaN(input))) {
      this._addAspect('bonus', +input, label)
    } else if (typeof input === 'object' && input != null) {
      this._addAspect('bonus', input.bonus, label)
      if (typeof input.value === 'number') {
        this._addAspect('value', input.value, label)
      }
      this._addAspect('xp', input.xp, label)
      if (input.activationPaid) {
        // For skills: Modifiers can pay for the skill's activation cost
        this._aspects.xp.activationPaid = true
      }
    } else {
      throw new Error(`Unknown modifier format: ${input}`)
    }
  }

  /**
   * Applies a modifier to a numeric value. At the moment, it just adds the bonus to the value
   * @param {number} value The value to modify
   * @return {number} The modified value
   */
  apply(value) {
    return value + this._bonus
  }

  explainBonus() {
    return ObjectUtils.cloneDeep(this._aspects.bonus)
  }

  get bonus() {
    return this._aspects.bonus.total
  }

  explainXp() {
    return ObjectUtils.cloneDeep(this._aspects.xp)
  }

  get xp() {
    return this._aspects.xp.total
  }

  // ----------------------------------------------------------------------------
  // Private methods
  // ----------------------------------------------------------------------------

  _addAspect(aspect, value, label) {
    if (value) {
      this._aspects[aspect].total += value
      this._aspects[aspect].components.push({ label, value })
    }
  }
}

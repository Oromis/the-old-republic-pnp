import ObjectUtils from './ObjectUtils.js'

export const STAGE_PERMANENT = 'permanent'
export const STAGE_TEMPORARY = 'temporary'

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
  inject(input, { label, stage }) {
    if (typeof input === 'number' || (typeof input === 'string' && !isNaN(input))) {
      this._addAspect('bonus', +input, label, stage)
    } else if (typeof input === 'object' && input != null) {
      this._addAspect('bonus', input.bonus, label, stage)
      if (typeof input.value === 'number') {
        this._addAspect('value', input.value, label, stage)
      }
      this._addAspect('xp', input.xp, label, stage)
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

  explainBonus({ stage } = {}) {
    return this._filterAspect(this._aspects.bonus, stage)
  }

  get bonus() {
    return this._aspects.bonus.total
  }

  explainXp({ stage } = {}) {
    return this._filterAspect(this._aspects.xp, stage)
  }

  get xp() {
    return this._aspects.xp.total
  }

  // ----------------------------------------------------------------------------
  // Private methods
  // ----------------------------------------------------------------------------

  _addAspect(aspect, value, label, stage) {
    if (stage == null) {
      throw new Error(`Stage is required`)
    }
    if (value) {
      this._aspects[aspect].total += value
      this._aspects[aspect].components.push({ label, value, stage })
    }
  }

  _filterAspect(aspect, stage) {
    const components = aspect.components.filter(c => stage == null || c.stage === stage)
    const total = components.reduce((sum, com) => sum + com.value, 0)
    return {
      ...ObjectUtils.omit(aspect, ['total', 'components']),
      total,
      components,
    }
  }
}

import {
  defineCachedGetter,
  defineDataAccessor,
  defineEnumAccessor,
  defineGetter,
  resolveGlobalSkill
} from '../util/EntityUtils.js'
import {analyzeDamageFormula, calcAverageDamage} from '../util/SheetUtils.js'
import ObjectUtils from '../util/ObjectUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'damage')
    defineEnumAccessor(this, 'damageType')
    defineDataAccessor(this, 'burstSize')
    defineGetter(this, 'isWeapon', () => true)

    defineGetter(this, 'skill', function () {
      const key = this.data.data.skill
      if (key) {
        // Try to find a globally available skill that matches this key
        const skill = resolveGlobalSkill(key)
        if (skill != null) {
          return skill
        } else {
          return { key, name: key }
        }
      }
    }, { configurable: true })

    defineCachedGetter(this, 'averageDamage', () => calcAverageDamage({ expression: this.data.data.damage.formula }))

    /// normalizedDamage is a score for the damage output irrespective of the damage type.
    /// Damage will be scaled to the "energy" damage type
    defineCachedGetter(this, 'normalizedDamage', () => this.averageDamage * ObjectUtils.try(this.damageType, 'energyEquivalentFactor', { default: 1 }))

    this._addUpdateFilter('data.damage.formula', data => {
      Object.assign(data.data.damage, analyzeDamageFormula({ expression: data.data.damage.formula, defaultExpr: '0' }))
    })
  }
}

import { defineDataAccessor, defineGetter, resolveGlobalSkill } from '../util/EntityUtils.js'
import { analyzeDamageFormula, analyzeExpression } from '../util/SheetUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'damage')
    defineDataAccessor(this, 'burstSize')

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

    this._addUpdateFilter('data.damage.formula', data => {
      Object.assign(data.data.damage, analyzeDamageFormula({ expression: data.data.damage.formula, defaultExpr: '0' }))
    })
  }
}

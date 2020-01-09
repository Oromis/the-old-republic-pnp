import { analyzeDamageFormula, analyzeExpression } from '../util/SheetUtils.js'
import { defineDataAccessor } from '../util/EntityUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'precision')
    defineDataAccessor(this, 'projectileEnergy')
    defineDataAccessor(this, 'energyCost')
    defineDataAccessor(this, 'burstSize')

    this._addUpdateFilter('data.precision.formula', data => {
      Object.assign(data.data.precision, analyzeExpression({ expression: data.data.precision.formula }))
    })
    this._addUpdateFilter('data.projectileEnergy.formula', data => {
      Object.assign(data.data.projectileEnergy, analyzeExpression({ expression: data.data.projectileEnergy.formula }))
    })
  }
}

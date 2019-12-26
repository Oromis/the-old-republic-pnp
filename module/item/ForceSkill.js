import { defineDataAccessor, defineEnumAccessor } from '../util/EntityUtils.js'
import { analyzeExpression } from '../util/SheetUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'cost')
    defineDataAccessor(this, 'effect')
    defineEnumAccessor(this, 'range', { dataKey: 'range.type', dataSetKey: 'rangeTypes' })
    defineEnumAccessor(this, 'duration', { dataKey: 'duration.type', dataSetKey: 'durationTypes', instanceDataKey: 'duration' })

    this._addUpdateFilter('data.duration.formula', data => {
      if (this.duration.hasFormula) {
        Object.assign(data.data.duration, analyzeExpression({ expression: data.data.duration.formula }))
      }
    })

    this._addUpdateFilter('data.cost.oneTime.formula', data => {
      Object.assign(data.data.cost.oneTime, analyzeExpression({ expression: data.data.cost.oneTime.formula, defaultExpr: '0' }))
    })
    this._addUpdateFilter('data.cost.perTurn.formula', data => {
      Object.assign(data.data.cost.perTurn, analyzeExpression({ expression: data.data.cost.perTurn.formula, defaultExpr: '0' }))
    })
    this._addUpdateFilter('data.effect.formula', data => {
      Object.assign(data.data.effect, analyzeExpression({ expression: data.data.effect.formula, defaultExpr: '0' }))
    })
  },

  afterPrepareData(actorData) {
    actorData.duration = this.duration.update().db
  },
}

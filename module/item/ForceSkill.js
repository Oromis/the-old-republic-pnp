import { defineDataAccessor, defineEnumAccessor, defineGetter } from '../util/EntityUtils.js'
import { analyzeExpression } from '../util/SheetUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'cost', { configurable: true })
    defineDataAccessor(this, 'effect', { configurable: true })
    defineEnumAccessor(this, 'range', { dataKey: 'range.type', dataSetKey: 'rangeTypes', instanceDataKey: 'range' })
    defineEnumAccessor(this, 'duration', { dataKey: 'duration.type', dataSetKey: 'durationTypes', instanceDataKey: 'duration' })
    defineEnumAccessor(this, 'disposition')
    defineGetter(this, 'fullEffectFormula', function () {
      if (this.effect.value != null) {
        let result = `${this.effect.value}`
        if (this.effect.d6) {
          result += `+${this.effect.d6}d6`
        }
        return result
      } else {
        return ''
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

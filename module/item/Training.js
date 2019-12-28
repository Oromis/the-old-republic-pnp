import { defineDataAccessor, defineGetter } from '../util/EntityUtils.js'
import { resolveEffectLabel } from '../util/SheetUtils.js'
import SwTorItem from './SwTorItem.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'gp')
    defineDataAccessor(this, 'dispositions')

    defineGetter(this, 'baseTraining', function () {
      return this._cache.lookup('baseTraining', () => {
        const baseTrainingData = this.data.data.baseTraining
        return baseTrainingData != null ? new SwTorItem(baseTrainingData) : null
      })
    })

    defineGetter(this, 'summary', function () {
      const lines = [`GP: ${this.gp}`]
      for (const effect of this.effects) {
        lines.push(`${effect.label || resolveEffectLabel(effect.key)}: ${effect.value}`)
      }
      return lines.join('\n')
    })
  }
}

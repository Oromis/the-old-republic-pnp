import { defineDataAccessor, defineGetter } from '../util/EntityUtils.js'
import SwTorItem from './SwTorItem.js'
import { formatEffectValue } from '../util/FormatUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'gp')
    defineDataAccessor(this, 'dispositions')
    defineDataAccessor(this, 'factions')

    defineGetter(this, 'baseTraining', function () {
      return this._cache.lookup('baseTraining', () => {
        const baseTrainingData = this.data.data.baseTraining
        return baseTrainingData != null ? new SwTorItem(baseTrainingData) : null
      })
    })

    defineGetter(this, 'summary', function () {
      return this.effects.map(effect => `${effect.label || effect.key}: ${formatEffectValue(effect.value)}`).join(', ')
    })
  }
}

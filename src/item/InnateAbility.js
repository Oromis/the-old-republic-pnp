import { defineDataAccessor, defineGetter } from '../util/EntityUtils.js'
import { formatEffectValue } from '../util/FormatUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'gp')

    defineGetter(this, 'summary', function () {
      return (Array.isArray(this.effects) ? this.effects : [])
        .map(effect => `${effect.label || effect.key}: ${formatEffectValue(effect.value)}`)
        .join(', ')
    })
  }
}

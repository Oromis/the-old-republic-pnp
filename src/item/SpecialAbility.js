import { defineDataAccessor, defineGetter } from '../util/EntityUtils.js'
import { resolveEffectLabel } from '../util/SheetUtils.js'
import { formatEffectValue } from '../util/FormatUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'gp')
    defineDataAccessor(this, 'xp')

    defineGetter(this, 'summary', function () {
      return this.effects
        .map(effect => `${effect.label || resolveEffectLabel(effect.key)}: ${formatEffectValue(effect.value)}`)
        .join(', ')
    })
  }
}

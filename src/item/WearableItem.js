import { defineDataAccessor, defineGetter } from '../util/EntityUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'encumberance')

    defineGetter(this, 'armor', function () {
      const effect = this.effects.find(effect => effect.key === 'r_armor')
      if (effect != null) {
        if (typeof effect.value === 'object') {
          return effect.value.bonus
        } else {
          return effect.value
        }
      } else {
        return 0
      }
    })
  }
}

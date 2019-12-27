import { defineGetter } from '../util/EntityUtils.js'

export default {
  beforeConstruct() {
    defineGetter(this, 'armor', function () {
      const effect = this.effects.find(effect => effect.key === 'r_armor')
      return effect != null ? effect.value : 0
    })
  }
}

import { defineGetter } from '../util/EntityUtils.js'
import { roundDecimal } from '../util/MathUtils.js'

export default {
  beforeConstruct() {
    defineGetter(this, 'currentStrengthModifier', function () {
      return roundDecimal((this.actor.attrValue('kk') + 50) / 100, 2)
    })

    defineGetter(this, 'canDefend', function () { return true })
  }
}

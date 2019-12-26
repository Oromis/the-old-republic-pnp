import { defineDataAccessor, defineGetter, makeRoll } from '../util/EntityUtils.js'
import { calcSkillXp, calcUpgradeCost, explainPropertyValue } from '../CharacterFormulas.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'buff')
    defineDataAccessor(this, 'gained')

    defineGetter(this, 'check', function () {
      const skillValue = this.value.total
      return {
        rolls: [
          makeRoll(this.attribute1),
          makeRoll(this.attribute2),
          makeRoll(this),
        ],
        AgP: Math.floor(skillValue / 5),
      }
    })

    defineGetter(this, 'currentXpCategory', function () {
      return this.data.data.tmpXpCategory || this.data.data.xpCategory
    })

    defineGetter(this, 'xp', function () {
      return calcSkillXp(this.actor, this)
    })

    defineGetter(this, 'value', function () {
      return explainPropertyValue(this.actor, this)
    })

    defineGetter(this, 'attribute1', function () {
      return this.actor.attributes[this.data.data.attribute1]
    })
    defineGetter(this, 'attribute2', function () {
      return this.actor.attributes[this.data.data.attribute2]
    })

    defineGetter(this, 'upgradeCost', function () {
      return calcUpgradeCost(this.actor, this, { max: this.actor.xp.free })
    })
  }
}

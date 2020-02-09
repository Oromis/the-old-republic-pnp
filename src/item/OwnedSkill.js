import { defineDataAccessor, defineGetter, makeRoll } from '../util/EntityUtils.js'
import { calcUpgradeCost, explainPropertyValue } from '../CharacterFormulas.js'
import RollUtils from '../util/RollUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'fixed')
    defineDataAccessor(this, 'buff')
    defineDataAccessor(this, 'gained')

    defineGetter(this, 'check', function () {
      const skillValue = this.value.total
      const result = {
        rolls: [
          makeRoll(this.attribute1),
          makeRoll(this.attribute2),
          makeRoll(this),
        ],
        AgP: { value: Math.floor(skillValue / 5) },
        confirmCriticals: true,
        actorId: this.actor.id,
      }
      if (this.actor.token != null) {
        result.tokenId = this.actor.token.id
        result.sceneId = this.actor.token.scene.id
      }
      return result
    })

    defineGetter(this, 'currentXpCategory', function () {
      return this.data.data.tmpXpCategory || this.effectiveXpCategory
    })

    defineGetter(this, 'effectiveXpCategory', function () {
      return this.actorDataSet.xpTable.modifyCategory(
        this.data.data.xpCategory,
        this.actor.modifiers[this.key].xpCategoryBonus
      )
    })

    defineGetter(this, 'xp', function () {
      let result = (this.gained || [])
        .reduce((acc, cur) => acc + (cur.xp == null || isNaN(cur.xp) ? 0 : cur.xp), 0)
      if (!this.isBasicSkill && !this.actor.modifiers[this.key].explainXp().activationPaid) {
        // Non-basic skills need to be activated (if not paid for by any bonus)
        result += this.actorDataSet.xpTable.getActivationCost(this.effectiveXpCategory)
      }
      return result
    })

    defineGetter(this, 'gainedXp', function () {
      return (this.gained || [])
        .reduce((acc, cur) => acc + (cur.xpGain == null || isNaN(cur.xpGain) ? 0 : cur.xpGain), 0)
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

    this.rollCheck = function rollCheck() {
      return RollUtils.rollCheck(this.check, {
        actor: this.actor.id,
        label: this.name,
      })
    }
  }
}

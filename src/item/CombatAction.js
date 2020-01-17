import DataCache from '../util/DataCache.js'
import ObjectUtils from '../util/ObjectUtils.js'
import { getActor, getActorByTokenId } from '../util/GameUtils.js'
import Config from '../Config.js'

const cache = new DataCache()

export default {

  // ---------------------------------------------------------------------
  // "Static" methods (to be used on the CombatAction object itself)
  // ---------------------------------------------------------------------

  async get(combatId) {
    let resultId = cache.lookup(combatId, () => {
      const combatAction = game.items.entities.find(item => (
        item.type === 'combat-action' && item.data.data.combat.id === combatId
      ))
      return combatAction != null ? combatAction.id : null
    })
    let result
    if (resultId != null) {
      result = game.items.get(resultId)
    }
    if (resultId == null || result == null) {
      // CombatAction doesn't exist yet
      const combatAction = await Item.create({
        type: 'combat-action',
        name: 'Kampfaktion',
        permission: { default: CONST.ENTITY_PERMISSIONS.OWNER },
        data: { combat: { id: combatId } }
      })
      cache.insert(combatId, combatAction.id)
      resultId = combatAction.id
    }
    return result || game.items.get(resultId)
  },

  // ---------------------------------------------------------------------
  // Instance methods (to be used on an item of type (CombatAction)
  // ---------------------------------------------------------------------

  beforeConstruct() {
    this.calcAttacks = function calcAttacks() {
      const effectivenessBonusMap = new Map()
      return this.data.data.attacks.map(raw => {
        const message = game.messages.get(raw.messageId)
        const attackCheck = ObjectUtils.try(message, 'data', 'flags', 'sw-tor', 'check')
        const attackWeapon = ObjectUtils.try(attackCheck, 'weapon', { default: { burstSize: 1, img: 'icons/svg/sword.svg' } })
        const effectivenessPenalty = Config.combat.defenseEffectivenessPenalty[attackCheck.tags.includes('melee') ? 'melee' : 'ranged']
        return {
          ...raw,
          message,
          weapon: attackWeapon,
          check: attackCheck,
          defenses: raw.defenses.map(defense => {
            const message = game.messages.get(defense.messageId)
            const defenseCheck = ObjectUtils.try(message, 'data', 'flags', 'sw-tor', 'check')
            const defender = getActor({
              tokenId: defenseCheck.tokenId,
              sceneId: defenseCheck.sceneId,
              actorId: defenseCheck.actorId
            })
            const instances = Array(attackWeapon.burstSize).fill().map((_, i) => {
              const prevBonus = effectivenessBonusMap.get(defender) || 0
              const totalEffectiveness = defenseCheck.effectiveness + prevBonus
              const res = {
                prevEffectiveness: defenseCheck.effectiveness,
                bonus: prevBonus,
                totalEffectiveness,
                hits: attackCheck.effectiveness > totalEffectiveness
              }
              effectivenessBonusMap.set(defender, prevBonus - effectivenessPenalty)
              return res
            })
            return {
              ...defense,
              message,
              instances,
              check: defenseCheck,
              totalHits: instances.reduce((acc, cur) => acc + (cur.hits ? 1 : 0), 0)
            }
          })
        }
      })
    }

    this.addAttackMessage = async function addAttackMessage(message) {
      const updateData = {}
      const existingCombatData = this.data.data.combat
      const currentCombatData = game.combats.active
      let existingAttacks = this.data.data.attacks
      if (existingCombatData == null || currentCombatData == null ||
        existingCombatData.round !== currentCombatData.round ||
        existingCombatData.turn !== currentCombatData.turn) {
        // New combat turn => clear combat action and start over
        {
          const prevAttacks = this.calcAttacks()
          for (const [actor, bonus] of prevAttacks.effectivenessBonusMap) {
            actor.update({ 'data.defenseEffectivenessBonus': bonus })
          }
        }
        existingAttacks = []
        if (currentCombatData != null) {
          updateData['data.combat'] = {
            round: currentCombatData.round,
            turn: currentCombatData.turn
          }
        }
      }
      updateData['data.attacks'] = [...existingAttacks, { messageId: message.id, defenses: [] }]
      return this.update(updateData)
    }

    this.addDefenseMessage = async function addDefenseMessage(message) {
      if (this.data.data.attacks.length > 0) {
        let found = false
        return this.update({
          'data.attacks': this.data.data.attacks.map((attack, index) => {
            if (!found && (attack.defenses.length === 0 || index === this.data.data.attacks.length - 1)) {
              found = true
              const copy = ObjectUtils.cloneDeep(attack)
              copy.defenses.push({ messageId: message.id })
              return copy
            } else {
              return attack
            }
          })
        })
      }
    }

    this.removeAttackByIndex = function removeAttackByIndex(index) {
      return this.update({
        'data.attacks': this.data.data.attacks.filter((d, i) => i !== index)
      })
    }

    this.removeDefenseByIndices = function removeDefenseByIndices(attackIndex, defenseIndex) {
      return this.update({
        'data.attacks': this.data.data.attacks.map((attack, ai) => {
          if (ai === attackIndex) {
            const copy = ObjectUtils.cloneDeep(attack)
            copy.defenses = copy.defenses.filter((d, di) => di !== defenseIndex)
            return copy
          } else {
            return attack
          }
        })
      })
    }
  }
}

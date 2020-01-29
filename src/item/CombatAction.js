import DataCache from '../util/DataCache.js'
import ObjectUtils from '../util/ObjectUtils.js'
import { getActor } from '../util/GameUtils.js'
import Config from '../Config.js'

const cache = new DataCache()

function onChange(combatAction, context) {
  if (game.settings.get('sw-tor', 'autoShowCombatActionTracker')) {
    const sheet = combatAction.sheet
    if (sheet) {
      sheet.render(true, context)
    }
  }
}

export default {

  // ---------------------------------------------------------------------
  // "Static" methods (to be used on the CombatAction object itself)
  // ---------------------------------------------------------------------

  /**
   * Same as get() but will not create a new CombatAction if it doesn't exist yet
   * @param combatId
   */
  getSync(combatId) {
    let resultId = cache.lookup(combatId, () => {
      const combatAction = game.items.entities.find(item => (
        item.type === 'combat-action' && item.data.data.combat.id === combatId
      ))
      return combatAction != null ? combatAction.id : null
    })
    let result = null
    if (resultId != null) {
      result = game.items.get(resultId)
    }
    return result
  },

  async get(combatId) {
    const result = this.getSync(combatId)
    if (result == null) {
      // CombatAction doesn't exist yet
      const combatAction = await Item.create({
        type: 'combat-action',
        name: 'Kampfaktion',
        permission: { default: CONST.ENTITY_PERMISSIONS.OWNER },
        data: { combat: { id: combatId } }
      }, {
        displaySheet: false,  // We have a different, setting-based mechanic to automatically show the combat tracker.
      })
      cache.insert(combatId, combatAction.id)
      return game.items.get(combatAction.id)
    } else {
      return result
    }
  },

  // ---------------------------------------------------------------------
  // Instance methods (to be used on an item of type (CombatAction)
  // ---------------------------------------------------------------------

  beforeConstruct() {
    this.processAttacks = function processAttacks(attacks = this.data.data.attacks) {
      const effectivenessBonusMap = new Map()
      return {
        effectivenessBonusMap,
        attacks: (attacks || []).map(raw => {
          const message = game.messages.get(raw.messageId)
          const attackCheck = ObjectUtils.try(message, 'data', 'flags', 'sw-tor', 'check')
          const attackWeapon = ObjectUtils.try(attackCheck, 'weapon', { default: { burstSize: 1, img: 'icons/svg/sword.svg' } })
          const isMelee = this.isMeleeAttack(raw)
          const effectivenessPenalty = Config.combat.defenseEffectivenessPenalty[isMelee ? 'melee' : 'ranged']
          return {
            ...raw,
            message,
            weapon: attackWeapon,
            check: attackCheck,
            defenses: raw.defenses.map(defense => {
              const message = game.messages.get(defense.messageId)
              const defenseCheck = ObjectUtils.try(message, 'data', 'flags', 'sw-tor', 'check')
              let defender = null, instances = []
              if (defenseCheck != null && attackCheck != null && attackWeapon != null) {
                defender = getActor({
                  tokenId: defenseCheck.tokenId,
                  sceneId: defenseCheck.sceneId,
                  actorId: defenseCheck.actorId,
                })
                instances = Array(attackWeapon.burstSize).fill().map(() => {
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
              }
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
    }

    this.isMeleeAttack = function isMeleeAttack(attack) {
      if (attack == null) {
        return true
      }
      const message = game.messages.get(attack.messageId)
      const attackCheck = ObjectUtils.try(message, 'data', 'flags', 'sw-tor', 'check')
      return attackCheck == null || attackCheck.tags.includes('melee')
    }

    this.onNextTurn = async function onNextTurn() {
      const combatAction = this.processAttacks()
      for (const [actor, bonus] of combatAction.effectivenessBonusMap) {
        await (actor.defenseEffectivenessBonus = (actor.defenseEffectivenessBonus || 0) + bonus)
      }
      if (this.data.data.attacks && this.data.data.attacks.length > 0) {
        await this.update({
          'data.attacks': [],
          'data.prevAttacks': this.data.data.attacks,
        })
      }
    }

    this.onPrevTurn = async function onPrevTurn() {
      const combatAction = this.processAttacks(this.data.data.prevAttacks)
      for (const [actor, bonus] of combatAction.effectivenessBonusMap) {
        await (actor.defenseEffectivenessBonus = (actor.defenseEffectivenessBonus || 0) - bonus)
      }
      if (this.data.data.prevAttacks && this.data.data.prevAttacks.length > 0) {
        await this.update({
          'data.attacks': this.data.data.prevAttacks,
          'data.prevAttacks': [],
        })
      }
    }

    this.addAttackMessage = async function addAttackMessage(message) {
      const updateData = {}
      const existingCombatData = this.data.data.combat
      const currentCombatData = game.combats.active
      let existingAttacks = this.data.data.attacks || []
      if (existingCombatData == null || currentCombatData == null ||
        existingCombatData.round !== currentCombatData.round ||
        existingCombatData.turn !== currentCombatData.turn) {
        // New combat turn => clear combat action and start over
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
      const referenceAttack = this.getNextUnhandledAttack()
      if (referenceAttack != null) {
        return this.update({
          'data.attacks': this.data.data.attacks.map((attack, index) => {
            if (attack === referenceAttack) {
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

    this.getNextUnhandledAttack = function getNextUnhandledAttack() {
      let result = null
      if (this.data.data.attacks != null && this.data.data.attacks.length > 0) {
        for (const attack of this.data.data.attacks) {
          if (attack.defenses.length === 0 || attack === this.data.data.attacks[this.data.data.attacks.length - 1]) {
            result = attack
            break
          }
        }
      }
      return result
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
  },

  onCreate(data, options, userId, context) {
    onChange(this, context)
  },

  onUpdate(data, options, userId, context) {
    onChange(this, context)
  },
}

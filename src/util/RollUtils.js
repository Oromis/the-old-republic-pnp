import ObjectUtils from './ObjectUtils.js'
import CombatAction from '../item/CombatAction.js'

function processCheck(check, { isConfirmation = false } = {}) {
  let criticalScore = 0
  for (const roll of check.rolls) {
    if (roll.die === 1) {
      ++criticalScore
    } else if (roll.die === 20) {
      --criticalScore
    }
  }

  check.criticalScore = criticalScore

  check.needsConfirmation = false
  if (check.confirmCriticals) {
    if (Math.abs(criticalScore) === 1) {
      if (check.confirmation == null) {
        // An unconfirmed critical result - either critical success or critical failure.
        // We need to confirm the result before the critical outcome becomes effective
        check.needsConfirmation = true
      } else {
        // A confirmation check has been rolled
        let confirmed
        const combinedScore = check.criticalScore + check.confirmation.criticalScore
        if (Math.abs(combinedScore) >= 2) {
          // Another critical roll of the same type => definitely confirmed
          confirmed = true
        } else if (combinedScore === 0) {
          // Another critical roll, but this one neutralized the first critical
          confirmed = false
        } else {
          // Undecided. Let's see whether we succeeded the roll
          if (check.criticalScore > 0) {
            // Attempting to confirm a "1", the confirmation needs to succeed
            confirmed = check.confirmation.success
          } else {
            // Attempting to confirm a "20", the confirmation must not succeed to confirm
            confirmed = !check.confirmation.success
          }
        }
        check.confirmed = confirmed
      }
    } else if (criticalScore !== 0) {
      // Roll is confirmed directly
      check.confirmed = true
    }
  } else {
    // No confirmation necessary => confirmed automatically
    check.confirmed = true
  }

  if (check.AgP != null) {
    if (check.confirmed != null) {
      if (check.confirmed && check.criticalScore !== 0) {
        check.AgP.bonus = check.criticalScore * (check.criticalBonus || 0)
      } else {
        check.AgP.bonus = null
      }
    } else if (check.AgP.bonus != null) {
      check.AgP.bonus = null
    }
  }

  for (const roll of check.rolls) {
    roll.diff = roll.target + (roll.advantage || 0) - roll.die
  }
  if (check.AgP != null) {
    check.AgP.diff = check.AgP.value +
      (check.AgP.bonus || 0) -
      check.rolls.reduce((acc, cur) => acc + (cur.diff < 0 ? -cur.diff : 0), 0)
  }

  if (check.calcEffectiveness && check.AgP && !check.needsConfirmation && !isConfirmation) {
    // At the moment, we only know how to calculate effectiveness for rolls with AgP.
    // Don't think this is a problem though...
    if (check.AgP.diff >= 0) {
      check.effectiveness = check.AgP.diff + check.rolls.reduce((acc, roll) => acc + Math.max(0, roll.diff), 0)
    } else {
      check.effectiveness = check.AgP.diff
    }
    check.effectiveness += (check.effectivenessBonus || 0)
  } else if (check.effectiveness != null) {
    check.effectiveness = null
  }

  if (!check.needsConfirmation) {
    check.success = check.AgP ? check.AgP.diff >= 0 : check.rolls.every(roll => roll.diff >= 0)
  } else if (check.success != null) {
    check.success = null
  }
}

export default {
  rollFormula(formula, { actor = undefined, label = undefined } = {}) {
    new Roll(formula).toMessage({
      speaker: { actor },
      flavor: label,
    })
  },

  processCheck,

  async rollCheck(check, { actor = undefined, label = undefined, isConfirmation = false, sendToChat = true } = {}) {
    const die = new Die(20)
    die.roll(check.rolls.length)

    const result = ObjectUtils.cloneDeep(check)
    result.rolls.forEach((roll, i) => {
      roll.die = die.results[i]
    })

    processCheck(result, { isConfirmation })

    if (sendToChat) {
      const chatData = {
        user: game.user.id,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rollMode: game.settings.get("core", "rollMode"),
        flavor: label,
        speaker: { actor },
        sound: CONFIG.sounds.dice,
        content: await renderTemplate('systems/sw-tor/templates/check-message.html', { check: result }),
        flags: { 'sw-tor': { check: result } },
        permission: { default: 0, [game.user.id]: CONST.ENTITY_PERMISSIONS.OWNER },
      }

      // Handle type
      if ( ["gmroll", "blindroll"].includes(chatData.rollMode) ) {
        chatData["whisper"] = game.users.entities.filter(u => u.isGM).map(u => u._id)
        if ( chatData.rollMode === "blindroll" ) {
          chatData["blind"] = true
        }
      }

      const message = await ChatMessage.create(chatData)
      const tags = ObjectUtils.asArray(check.tags) || []
      const isAttack = tags.includes('attack')
      if (isAttack || tags.includes('defense')) {
        if (game.combats.active != null) {
          const combatAction = await CombatAction.get(game.combats.active.id)
          if (isAttack) {
            await combatAction.addAttackMessage(message)
          } else {
            await combatAction.addDefenseMessage(message)
          }
        }
      }
    }

    return result
  }
}

import ObjectUtils from './ObjectUtils.js'

function processCheck(check, { isConfirmation = false } = {}) {
  check.needsConfirmation = false
  if (check.confirmCriticals && check.confirmed == null) {
    let criticalScore = 0
    for (const roll of check.rolls) {
      if (roll.die === 1) {
        ++criticalScore
      } else if (roll.die === 20) {
        --criticalScore
      }
    }

    check.criticalScore = criticalScore
    if (Math.abs(criticalScore) === 1) {
      // An unconfirmed critical result - either critical success or critical failure.
      // We need to confirm the result before the critical outcome becomes effective
      check.needsConfirmation = true
    } else if (criticalScore !== 0) {
      // Roll is confirmed directly
      check.confirmed = true
    }
  }

  if (check.confirmed) {
    check.AgP.bonus = check.criticalScore * (check.criticalBonus || 0)
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
    if (check.AgP.diff >= 0) {
      check.effectiveness = check.AgP.diff + check.rolls.reduce((acc, roll) => acc + Math.max(0, roll.diff), 0)
    } else {
      check.effectiveness = check.AgP.diff
    }
  }

  if (!check.needsConfirmation) {
    check.success = check.AgP ? check.AgP.diff >= 0 : check.rolls.every(roll => roll.diff >= 0)
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
      }
      if (result.needsConfirmation) {
        chatData.permission = { default: 0, [game.user.id]: CONST.ENTITY_PERMISSIONS.OWNER }
      }

      // Handle type
      if ( ["gmroll", "blindroll"].includes(chatData.rollMode) ) {
        chatData["whisper"] = game.users.entities.filter(u => u.isGM).map(u => u._id)
        if ( chatData.rollMode === "blindroll" ) {
          chatData["blind"] = true
        }
      }

      ChatMessage.create(chatData)
    }

    return result
  }
}

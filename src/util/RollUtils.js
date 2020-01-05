export default {
  rollFormula(formula, { actor = undefined, label = undefined } = {}) {
    new Roll(formula).toMessage({
      speaker: { actor },
      flavor: label,
    })
  },

  async rollCheck(check, { actor = undefined, label = undefined } = {}) {
    const die = new Die(20)
    die.roll(check.rolls.length)

    let critical = 0
    const payload = {
      rolls: check.rolls.map((roll, i) => {
        if (die.results[i] === 1) {
          ++critical
        } else if (die.results[i] === 20) {
          --critical
        }
        return { ...roll, die: die.results[i], diff: roll.target + (roll.advantage || 0) - die.results[i] }
      }),
    }
    if (typeof check.AgP === 'number') {
      payload.AgP = {
        value: check.AgP,
        diff: check.AgP - payload.rolls.reduce((acc, cur) => acc + (cur.diff < 0 ? -cur.diff : 0), 0)
      }
    }
    if (Math.abs(critical) === 1) {
      // An unconfirmed critical result - either critical success or critical failure.
      // We need to confirm the result before the critical outcome becomes effective
      payload.needsConfirmation = true
      payload.criticalScore = critical
    }
    const chatData = {
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rollMode: game.settings.get("core", "rollMode"),
      flavor: label,
      speaker: { actor },
      sound: CONFIG.sounds.dice,
      content: await renderTemplate('systems/sw-tor/templates/check-roll.html', payload),
      check: payload,
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
}

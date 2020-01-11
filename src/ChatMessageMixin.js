import Mixin from './sheets/Mixin.js'
import ObjectUtils from './util/ObjectUtils.js'
import RollUtils from './util/RollUtils.js'

export default class ChatMessageMixin extends Mixin {
  constructor(...args) {
    super(...args)

    this.interceptMethod('render', this.render, { wrapSuper: true })
  }

  async render({ args, originalThis, callSuper }) {
    if (originalThis.isRoll && !originalThis.isRollVisible) {
      // We don't show rolls that we have no permission to view
      return ''
    } else {
      let html = await callSuper(...args)
      if (originalThis.isAuthor && ObjectUtils.try(originalThis.data.flags, 'sw-tor', 'check', 'needsConfirmation')) {
        // Critical result needs to be confirmed
        html.find('.sw-tor-confirm-button').on('click', async () => {
          const originalCheck = originalThis.data.flags['sw-tor'].check
          const confirmation = await RollUtils.rollCheck(originalCheck, {
            isConfirmation: true,
            sendToChat: false,
          })
          let confirmed
          const combinedScore = originalCheck.criticalScore + confirmation.criticalScore
          if (Math.abs(combinedScore) >= 2) {
            // Another critical roll of the same type => definitely confirmed
            confirmed = true
          } else if (combinedScore === 0) {
            // Another critical roll, but this one neutralized the first critical
            confirmed = false
          } else {
            // Undecided. Let's see whether we succeeded the roll
            if (originalCheck.criticalScore > 0) {
              // Attempting to confirm a "1", the confirmation needs to succeed
              confirmed = confirmation.success
            } else {
              // Attempting to confirm a "20", the confirmation must not succeed to confirm
              confirmed = !confirmation.success
            }
          }

          originalCheck.confirmed = confirmed

          RollUtils.processCheck(originalCheck)
          originalThis.update({
            'flags.sw-tor.check.needsConfirmation': false,
            content: await renderTemplate('systems/sw-tor/templates/check-message.html', {
              check: originalCheck,
              confirmation,
            }),
          })
        })
      }
      return html
    }
  }
}

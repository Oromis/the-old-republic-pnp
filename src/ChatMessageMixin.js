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
        // Unfortunately, this doesn't seem to work due to the fact that we cannot add custom
        // properties to a ChatMessage's data object
        const button = $(`<button type="button" class="sw-tor-confirm-button"><i class="fas fa-dice-d20"></i> Bestätigen</button>`)
        button.on('click', () => {
          const originalCheck = originalThis.data.flags['sw-tor'].check
          RollUtils.rollCheck({ rolls: originalCheck.rolls, AgP: originalCheck.AgP.value }, {
            actor: originalThis.data.speaker.actor,
            label: `Bestätigung ${originalThis.data.flavor}`,
            isConfirmation: true
          })
          originalThis.update({ 'flags.sw-tor.check.needsConfirmation': false })
        })
        html.find('.message-content').append(button)
      }
      return html
    }
  }
}

import Mixin from './sheets/Mixin.js'
import ObjectUtils from './util/ObjectUtils.js'
import RollUtils from './util/RollUtils.js'
import CheckMessageEditor from './apps/CheckMessageEditor.js'

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
          const check = ObjectUtils.cloneDeep(originalThis.data.flags['sw-tor'].check)
          const confirmation = await RollUtils.rollCheck(check, {
            isConfirmation: true,
            sendToChat: false,
          })

          check.confirmation = confirmation

          RollUtils.processCheck(check)
          originalThis.update({
            'flags.sw-tor.check': check,
            content: await renderTemplate('systems/sw-tor/templates/check-message.html', {
              check: check,
              confirmation,
            }),
          })
        })
      }

      if (originalThis.owner) {
        // Turn the "flavor" text into a link that opens the roll editor
        const originalFlavor = html.find('.flavor-text')
        const flavorLink = $(`<a class="flavor-text">${originalFlavor.text()}</a>`)
        flavorLink.on('click', () => {
          new CheckMessageEditor(originalThis).render(true)
        })
        originalFlavor.replaceWith(flavorLink)
      }
      return html
    }
  }
}

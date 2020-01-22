import Mixin from './sheets/Mixin.js'
import ObjectUtils from './util/ObjectUtils.js'
import RollUtils from './util/RollUtils.js'
import CheckMessageEditor from './apps/CheckMessageEditor.js'

export default class ChatMessageMixin extends Mixin {
  constructor(Subject, ...rest) {
    super(Subject, ...rest)

    this.interceptMethod('render', this.render, { wrapSuper: true })

    const oldPrepareData = Subject.prepareData
    Subject.prepareData = function (...args) {
      const data = (typeof oldPrepareData === 'function' ?
        oldPrepareData.call(this, ...args) :
        Subject.prototype.prepareData.call(this, ...args)
      ) || this.data || {}
      if (data.permission == null) {
        data.permission = { default: CONST.ENTITY_PERMISSIONS.OBSERVER, [this.data.user]: CONST.ENTITY_PERMISSIONS.OWNER }
      }
      return data
    }
  }

  async render({ args, originalThis, callSuper }) {
    if (originalThis.isRoll && !originalThis.isRollVisible) {
      // We don't show rolls that we have no permission to view
      return ''
    } else {
      let html = await callSuper(...args)
      if (originalThis.isAuthor && ObjectUtils.try(originalThis.data.flags, 'sw-tor', 'check', 'needsConfirmation')) {
        // Critical result needs to be confirmed
        const btn = $('<button type="button" class="sw-tor-confirm-button"><i class="fas fa-dice-d20"></i> Bestätigen</button>')
        btn.on('click', async () => {
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
        html.find('.message-content').append(btn)
      }

      if (originalThis.user != null && originalThis.user.id === game.user.id) {
        // Turn the "flavor" text into a link that opens the roll editor
        const originalFlavor = html.find('.flavor-text')
        const flavorLink = $(`<a class="flavor-text">${originalFlavor.text()}</a>`)
        flavorLink.on('click', () => {
          new CheckMessageEditor(originalThis).render(true)
        })
        originalFlavor.replaceWith(flavorLink)
      }

      // Render all apps connected to the ChatMessage (Foundry normally overrides this to not execute this
      // logic for ChatMessages because it doesn't have any apps for ChatMessges, but now we have one
      // (CombatActionSheet can register as a ChatMessage app))
      for (let app of Object.values(originalThis.apps) ) {
        if (!(app instanceof CheckMessageEditor)) {
          app.render(false)
        }
      }
      return html
    }
  }
}

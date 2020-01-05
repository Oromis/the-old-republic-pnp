import Mixin from './sheets/Mixin.js'
import ObjectUtils from './util/ObjectUtils.js'

export default class ChatMessageMixin extends Mixin {
  constructor(...args) {
    super(...args)

    this.interceptMethod('render', this.render, { wrapSuper: true })
  }

  render({ args, originalThis, callSuper }) {
    if (originalThis.isRoll && !originalThis.isRollVisible) {
      // We don't show rolls that we have no permission to view
      return ''
    } else {
      let html = callSuper(...args)
      if (originalThis.isAuthor && ObjectUtils.try(originalThis.data.check, 'needsConfirmation')) {
        // Unfortunately, this doesn't seem to work due to the fact that we cannot add custom
        // properties to a ChatMessage's data object
        html += `<button type="button"><i class="fas fa-dice-d20"></i> Confirm</button>`
      }
      return html
    }
  }
}

import Mixin from './sheets/Mixin.js'

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
      return callSuper(...args)
    }
  }
}

import ObjectUtils from '../util/ObjectUtils.js'

export const CTRL = 'ctrlKey'
export const ALT = 'altKey'
export const SHIFT = 'shiftKey'

export default class Shortcuts {
  static create(element) {
    return new Shortcuts(element)
  }

  constructor(element) {
    element.addEventListener('keyup', e => this._onKeyUp(e))

    this._shortcuts = []
  }

  add(modifiers, key, handler) {
    this._shortcuts.push({ key: key.toLowerCase(), modifiers: ObjectUtils.asArray(modifiers), handler })
    return this
  }

  _onKeyUp(event) {
    for (const shortcut of this._shortcuts) {
      if (shortcut.key === event.key && shortcut.modifiers.every(mod => event[mod])) {
        shortcut.handler(event)
        event.stopPropagation()
        event.preventDefault()
        break
      }
    }
  }
}

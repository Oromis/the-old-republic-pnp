import { timeout } from './Timing.js'

export default class AutoSubmitSheet {
  constructor(parent) {
    this.parent = parent

    const parentActivateListeners = this.parent.activateListeners
    this.parent.activateListeners = (...args) => {
      this.activateListeners(...args)
      parentActivateListeners.call(this.parent, ...args)
    }

    // Disable default submit logic (it doesn't update the entity immediately when jumping between inputs)
    this.parent._onUnfocus = () => {}
  }

  activateListeners(html) {
    if (this.parent.options.submitOnUnfocus) {
      // Enable auto-submit
      html.find('input')
        .on('change', this._onChangeInput)
        .on('keypress', this._onEnter)
    }
  }

  _onChangeInput = async e => {
    await this._onSubmit(e)
  }

  _onEnter = async e => {
    if (e.key === 'Enter') {
      await this._onSubmit(e)
    }
  }

  async _onSubmit(event) {
    // Make sure the focus has moved to the next element (if any) - this way we're able to restore focus after updating
    await timeout(0)

    const activeElement = document.activeElement
    let focusKey = null
    if (activeElement != null) {
      focusKey = activeElement.getAttribute('name')
    }

    await this.parent._onSubmit(event)

    if (focusKey != null) {
      $(`[name="${focusKey}"]`).focus().select()
    }
  }
}

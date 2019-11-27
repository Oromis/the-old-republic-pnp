export default class AutoSubmitSheet {
  constructor(parent) {
    this.parent = parent

    const parentActivateListeners = this.parent.activateListeners
    this.parent.activateListeners = (...args) => {
      this.activateListeners(...args)
      parentActivateListeners.call(this.parent, ...args)
    }
  }

  activateListeners(html) {
    if (this.parent.options.submitOnUnfocus) {
      // Enable auto-submit
      html.find('input')
        .on('change', this._onChangeInput)
        .on('focus', this._onFocusInput)
        .on('keypress', this._onEnter)
    }

    if (this._focusedKey != null) {
      html.find(`[name="${this._focusedKey}"]`).focus().select()
    }
  }

  _onChangeInput = async e => {
    await this._onSubmit(e)
    this._focusedKey = null
  }

  _onFocusInput = e => {
    this._focusedKey = $(e.target).attr('name')
  }

  _onEnter = async e => {
    if (e.key === 'Enter') {
      await this._onSubmit(e)
    }
  }

  _onSubmit(event) {
    this.parent._onSubmit(event)
  }
}

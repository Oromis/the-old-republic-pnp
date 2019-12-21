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

    this._filters = []
  }

  activateListeners(html) {
    if (this.parent.options.submitOnUnfocus) {
      // Enable auto-submit
      html.find('input, select')
        .on('change', this._onChangeInput)
        .on('keypress', this._onEnter)
    }
  }

  addFilter(path, callback) {
    if (!Array.isArray(path)) {
      path = path.split('.')
    }
    this._filters.push({ path, callback })
  }

  _onChangeInput = async e => {
    const link = e.target.getAttribute('data-link')
    if (link) {
      const related = $(this.parent.form).find(`[name="${link}"]`)
      if (related.length) {
        related.val(e.target.value)
      }
    }
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

    // Do not perform a general submit, only update one single field
    const name = event.target.getAttribute('data-link') || event.target.getAttribute('name')
    if (name != null) {
      const namePath = name.split('.')
      let updateData = { [name]: event.target.value }
      for (const filter of this._filters) {
        let matches = true
        for (let i = 0; i < filter.path.length; ++i) {
          if (filter.path[i] !== '*' && namePath[i] !== filter.path[i]) {
            matches = false
            break
          }
        }
        if (matches) {
          const res = filter.callback(updateData, { name, path: namePath })
          if (typeof res !== 'undefined') {
            updateData = res
          }
        }
      }

      if (Object.keys(updateData).length > 0) {
        await this.parent.actor.update(updateData)
      }
    }

    if (focusKey != null) {
      $(this.parent.form).find(`[name="${focusKey}"]`).focus().select()
    }
  }
}

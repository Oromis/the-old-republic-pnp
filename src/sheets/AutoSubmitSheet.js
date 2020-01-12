import { timeout } from '../util/Timing.js'
import Mixin from './Mixin.js'

export default class AutoSubmitSheet extends Mixin {
  constructor(parent, { customUpdate } = {}) {
    super(parent)

    this.interceptMethod('activateListeners', this.activateListeners)

    // Disable default submit logic (it doesn't update the entity immediately when jumping between inputs)
    this.interceptMethod('_onUnfocus', () => false)
    this.interceptMethod('_onSubmit', () => Promise.resolve({}))

    this._filters = []
    this._focusSelector = null
    this._focusSelectorTimeout = null
    this._scrollPositions = {}
    this._customUpdate = customUpdate
  }

  activateListeners(html) {
    if (this.parent.options.submitOnUnfocus) {
      // Enable auto-submit
      html.find('input, select')
        .on('change', this._onChangeInput)
        .on('keypress', this._onEnter)

      html.find('textarea')
        .on('change', this._onChangeInput)

      html.find('button')
        .on('click', this._recordFocus)
    }

    // Support Image updates
    html.find('img[data-editable]').click(this._onEditImage)

    // Listen for scroll events to restore scroll position after an update
    html.find('.tab-wrapper').on('scroll', e => {
      let key = ''
      const dataId = e.currentTarget.getAttribute('data-id')
      if (dataId) {
        key = dataId
      }
      this._scrollPositions[key] = e.currentTarget.scrollTop
    })
    for (const [key, scrollTop] of Object.entries(this._scrollPositions)) {
      let selector = '.tab-wrapper'
      if (key) {
        selector += `[data-id="${key}"]`
      }
      html.find(selector).scrollTop(scrollTop)
    }

    if (this._focusSelector != null) {
      const elements = html.find(this._focusSelector)
      elements.focus().select()
    }
  }

  addFilter(path, callback) {
    if (!Array.isArray(path)) {
      path = path.split('.')
    }
    this._filters.push({ path, callback })
  }

  _onEditImage = (event) => {
    const oldImage = this.parent.entity.data.img
    new FilePicker({
      type: "image",
      current: oldImage,
      callback: path => {
        event.currentTarget.src = path
        this.parent.entity.update({ img: path })
      },
      top: this.parent.position.top + 40,
      left: this.parent.position.left + 10
    }).browse(oldImage)
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

  _recordFocus = async () => {
    // Make sure the focus has moved to the next element (if any) - this way we're able to restore focus after updating
    await timeout(0)

    const activeElement = document.activeElement
    let focusSelector = null
    if (activeElement != null && this.parent.form.contains(activeElement)) {
      for (const attr of ['name', 'data-id', 'data-link']) {
        const val = activeElement.getAttribute(attr)
        if (val != null) {
          focusSelector = `[${attr}="${val}"]`
          break
        }
      }
    }
    clearTimeout(this._focusSelectorTimeout)
    this._focusSelector = focusSelector
    setTimeout(() => this._focusSelector = null, 500)
  }

  async _onSubmit(event) {
    await this._recordFocus()

    // Do not perform a general submit, only update one single field
    const target = event.target
    const name = target.getAttribute('data-link') || target.getAttribute('name')
    if (name != null) {
      const namePath = name.split('.')
      let value = target.value
      if (['checkbox', 'radio'].indexOf(target.getAttribute('type')) !== -1) {
        value = target.checked
      }
      const dtype = target.getAttribute('data-dtype')
      if (dtype === 'Number') {
        value = +value
      } else if (dtype === 'Boolean') {
        value = value === 'true'
      }
      let updateData = { [name]: value }
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
        if (typeof this._customUpdate === 'function') {
          return this._customUpdate(updateData)
        } else {
          return this.parent.entity.update(updateData)
        }
      }
    }
  }
}

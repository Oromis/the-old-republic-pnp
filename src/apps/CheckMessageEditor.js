import ObjectUtils from '../util/ObjectUtils.js'
import AutoSubmitSheet from '../sheets/AutoSubmitSheet.js'
import RollUtils from '../util/RollUtils.js'

export default class CheckMessageEditor extends BaseEntitySheet {
  constructor(checkMessage, ...rest) {
    super(checkMessage, ...rest)

    this._check = ObjectUtils.cloneDeep(ObjectUtils.try(checkMessage.data.flags, 'sw-tor', 'check'))
    this._ui = { linkAdvantages: true }

    const autoSubmit = new AutoSubmitSheet(this, { customUpdate: this._updateCheck })
    autoSubmit.addFilter('ui', (data, { name, path }) => {
      const [ui, ...rest] = path
      ObjectUtils.set(this._ui, rest.join('.'), data[name])
      this.render(false)
      return {}
    })
    autoSubmit.addFilter('rolls.*.advantage', this._onUpdateAdvantage)
    autoSubmit.addFilter('confirmation.rolls.*.advantage', this._onUpdateAdvantage)
  }

  get message() {
    return this.object
  }

  static get defaultOptions() {
    const options = super.defaultOptions
    options.classes = ["sw-tor", "sheet", "check-message"]
    options.template = "systems/sw-tor/templates/check-message-editor.html"
    options.width = 400
    options.height = 410
    options.closeOnSubmit = true
    options.submitOnClose = false
    options.submitOnUnfocus = true
    options.resizable = true
    return options
  }

  get id() {
    return `roll-${this.message.id}`
  }

  get title() {
    return `${this.message.alias}: ${this.message.data.flavor}`
  }

  getData() {
    const data = super.getData()
    this._updateChecks()
    data.check = this._check
    data.ui = this._ui
    return data
  }

  activateListeners(html) {
    super.activateListeners(html)

    if (!this.isEditable) {
      return
    }

    html.find('.submit-button').on('click', this._onSaveChanges)
  }

  _updateCheck = diff => {
    for (const [path, value] of Object.entries(diff)) {
      ObjectUtils.set(this._check, path, value)
    }
    return this.render(false)
  }

  _onUpdateAdvantage = (data, { name }) => {
    if (this._ui.linkAdvantages) {
      this._check.rolls.forEach((roll, index) => {
        data[`rolls.${index}.advantage`] = data[name]
      })
      if (this._check.confirmation) {
        this._check.confirmation.rolls.forEach((roll, index) => {
          data[`confirmation.rolls.${index}.advantage`] = data[name]
        })
      }
    }
  }

  _updateChecks = () => {
    if (this._check.confirmation) {
      RollUtils.processCheck(this._check.confirmation, { isConfirmation: true })
    }
    RollUtils.processCheck(this._check)
  }

  _onSaveChanges = async () => {
    this._updateChecks()
    await this.message.update({
      'flags.sw-tor.check': this._check,
      content: await renderTemplate('systems/sw-tor/templates/check-message.html', {
        check: this._check,
        confirmation: this._check.confirmation,
      }),
    })
    return this.close()
  }
}

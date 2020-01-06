import AutoSubmitSheet from './AutoSubmitSheet.js'
import { onDragOver, onDropItem } from '../util/SheetUtils.js'
import SheetWithEffects from './SheetWithEffects.js'

export default class InnateAbilitySheet extends ItemSheet {
  constructor(...args) {
    super(...args)

    const autoSubmit = new AutoSubmitSheet(this)
    new SheetWithEffects(this, { autoSubmit, paysForActivation: true })
  }

	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
			classes: ["sw-tor", "sheet", "item"],
			template: "systems/sw-tor/templates/innate-ability-sheet.html",
			width: 554,
			height: 600,
		})
  }

  getData() {
    const data = super.getData()
    data.innateAbility = data.ability = data.item = this.item
    return data
  }

	activateListeners(html) {
    super.activateListeners(html)

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return

    // Make the Item sheet droppable for other items
    this.form.ondragover = onDragOver()
    this.form.ondrop = onDropItem(this._handleDrop)
  }

  _updateObject() {
    return Promise.resolve()
  }

  // Needed for SheetWithEffects
  _handleDrop = () => {
    return false
  }
}

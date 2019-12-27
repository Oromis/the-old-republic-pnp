import AutoSubmitSheet from './AutoSubmitSheet.js'
import { onDragOver, onDropItem } from '../util/SheetUtils.js'
import ObjectUtils from '../util/ObjectUtils.js'
import SheetWithEffects from './SheetWithEffects.js'

/**
 * Extend the basic ItemSheet with some very simple modifications
 */
export default class PhysicalItemSheet extends ItemSheet {
  constructor(...args) {
    super(...args)

    const autoSubmit = new AutoSubmitSheet(this)
    if (this.item.itemType.hasEffects) {
      new SheetWithEffects(this, { autoSubmit })
    }

    autoSubmit.addFilter('data.slotTypes.*', (obj, { name, path }) => {
      const slotTypes = ObjectUtils.cloneDeep(this.item.data.data.slotTypes || [])
      slotTypes[path[2]] = obj[name]
      return { 'data.slotTypes': slotTypes }
    })
  }

  /**
   * Extend and override the default options used by the Simple Item Sheet
   * @returns {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
			classes: ["sw-tor", "sheet", "item"],
			template: "systems/sw-tor/templates/item-sheet.html",
			width: 570,
			height: 480,
		})
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for rendering the Item sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData() {
    const data = super.getData()
    data.item = this.item
    return data
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {object}   The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html)

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return

    // Make the Item sheet droppable for other items
    this.form.ondragover = onDragOver()
    this.form.ondrop = onDropItem(this._handleDrop)

    html.find('.new-slot-type').click(() => {
      this.item.update({
        'data.slotTypes': [...(this.item.data.data.slotTypes || []), null]
      })
    })
    html.find('.delete-slot-type').click(e => {
      const targetIndex = +e.currentTarget.getAttribute('data-index')
      this.item.update({
        'data.slotTypes': (this.item.data.data.slotTypes || []).filter((s, i) => i !== targetIndex)
      })
    })
  }

  _handleDrop = (type, item) => {
    if ((this.item.type === 'melee-weapon' && item.data.category === 'melee') ||
      (this.item.type === 'ranged-weapon' && item.data.category === 'ranged')) {
      // Weapon skill
      this.item.update({
        'data.skill': item.data.key,
      })
      return true
    } else {
      return false
    }
  }

  /* -------------------------------------------- */

  /**
   * Disable regular updates (we use AutoSubmit)
   */
  _updateObject() {
    return Promise.resolve()
  }
}

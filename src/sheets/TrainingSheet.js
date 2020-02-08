import AutoSubmitSheet from './AutoSubmitSheet.js'
import { onDragOver, onDropItem } from '../util/SheetUtils.js'
import SheetWithEffects from './SheetWithEffects.js'
import Factions from '../datasets/Factions.js'

export default class TrainingSheet extends ItemSheet {
  constructor(...args) {
    super(...args)

    const autoSubmit = new AutoSubmitSheet(this)
    new SheetWithEffects(this, { autoSubmit, paysForActivation: true })

    // autoSubmit.addFilter('data.factions.*', (obj, { name, path }) => {
    //   if (this.item.data.data.factions == null) {
    //     obj['data.factions'] = {
    //       [path[path.length - 1]]: obj[name]
    //     }
    //     delete obj[name]
    //   }
    //   return obj
    // })
  }

  /**
   * Extend and override the default options used by the Simple Item Sheet
   * @returns {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
			classes: ["sw-tor", "sheet", "item"],
			template: "systems/sw-tor/templates/training-sheet.html",
			width: 554,
			height: 700,
		})
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for rendering the Item sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData() {
    const data = super.getData()
    data.factions = Factions
    data.training = data.item = this.item
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

    // Delete BaseTraining Item
    html.find('.baseTraining-delete').click(() => {
      this.item.update({
        'data.baseTraining': null
      })
      this.render(false)
    })
  }

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject() {
    return Promise.resolve()
  }

  _handleDrop = (type, item) => {
    if(type === 'training') {
      // TODO is it a good idea to store the entire training data structure? If the base training changes,
      //  the child won't be adjusted automatically.
      this.item.update({
        'data.baseTraining': item
      })
      return true
    } else {
      return false
    }
  }
}

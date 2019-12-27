import AutoSubmitSheet from './AutoSubmitSheet.js'
import CharacterDispositions from '../datasets/CharacterDispositions.js'
import {onDragOver, onDropItem, resolveEffectLabel} from '../util/SheetUtils.js'
import SheetWithEffects from './SheetWithEffects.js'

export function describeTraining(training) {
  let desc = 'GP: '.concat( training.data.gp)
  for (const effect of training.data.effects) {
    desc = desc.concat('\n', effect.label || resolveEffectLabel(effect.key), ': ', effect.value)
  }
  return desc
}

export default class TrainingSheet extends ItemSheet {
  constructor(...args) {
    super(...args)

    const autoSubmit = new AutoSubmitSheet(this)
    new SheetWithEffects(this, { autoSubmit })
  }

  /**
   * Extend and override the default options used by the Simple Item Sheet
   * @returns {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
			classes: ["sw-tor", "sheet", "item"],
			template: "systems/sw-tor/templates/training-sheet.html",
			width: 520,
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
    data.dispositionList = CharacterDispositions.list.map(e => ({
      ...e,
      value: data.data.dispositions[e.key]
    }))
    if(data.data.baseTraining) {
      data.baseTrainingEffects = describeTraining(data.data.baseTraining)
    }
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

    // Delete BaseTraining Item
    html.find('.baseTraining-delete').click(ev => {
      this.item.update({
        'data.baseTraining': null
      })
      this.render(false)
    });
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
      this.item.update({
        'data.baseTraining': item
      })
      return true
    } else {
      return false
    }
  }
}

import AutoSubmitSheet from './AutoSubmitSheet.js'
import DamageTypes from './DamageTypes.js'
import {analyzeDamageFormula, analyzeExpression} from './SheetUtils.js'
import SlotTypes from './SlotTypes.js'

/**
 * Extend the basic ItemSheet with some very simple modifications
 */
export default class SwTorItemSheet extends ItemSheet {
  constructor(...args) {
    super(...args);

    /**
     * Keep track of the currently active sheet tab
     * @type {string}
     */
    this._sheetTab = "description"

    new AutoSubmitSheet(this)
  }

  /**
   * Extend and override the default options used by the Simple Item Sheet
   * @returns {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
			classes: ["sw-tor", "sheet", "item"],
			template: "systems/sw-tor/templates/item-sheet.html",
			width: 520,
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
    const type = data.item.type
    data.computed = {}
    data.flags = {
      isWeapon: type === 'melee-weapon' || type === 'ranged-weapon',
      isMeleeWeapon: type === 'melee-weapon',
      isEquippable: type === 'melee-weapon' || type === 'ranged-weapon' || type === 'wearable',
    }
    if (data.flags.isWeapon) {
      data.computed.damage = analyzeDamageFormula({ path: [data.data.damage, 'formula'], defaultExpr: '0' })
    }
    data.damageTypes = DamageTypes.list
    data.slotTypes = SlotTypes.list
    return data
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {object}   The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    let tabs = html.find('.tabs');
    let initial = this._sheetTab;
    new Tabs(tabs, {
      initial: initial,
      callback: clicked => this._sheetTab = clicked.data("tab")
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return

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

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event, formData) {
    const slotTypes = []
    for (const key of Object.keys(formData)) {
      const match = key.match(/data.slotTypes\[(\d+)]/)
      if (match) {
        slotTypes[match[1]] = formData[key]
        delete formData[key]
      }
    }
    formData['data.slotTypes'] = slotTypes

    return this.item.update(formData)
  }
}

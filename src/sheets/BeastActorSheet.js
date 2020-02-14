import SheetWithTabs from './SheetWithTabs.js'
import BaseActorSheet from './BaseActorSheet.js'
import SheetWithIncomingDamage from './SheetWithIncomingDamage.js'

export default class BeastActorSheet extends BaseActorSheet {
  constructor(...args) {
    super(...args)

    new SheetWithTabs(this)

    if (this.isEditable) {
      new SheetWithIncomingDamage(this, { autoSubmit: this.autoSubmit })

      this.autoSubmit.addFilter('data.attributes.*.fixed', this._processDeltaProperty)
    }
  }

  /* -------------------------------------------- */

  /**
   * Extend and override the default options used by the 5e Actor Sheet
   * @returns {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["sw-tor", "sheet", "actor", "beast"],
  	  template: "systems/sw-tor/templates/beast-sheet.html",
      submitOnChange: true,
      width: 784,
      height: 600
    });
  }

  getData() {
    const data = super.getData()

    data.computed = {
      slots: this.actor.dataSet.slots.list.map(slot => this._formatSlot(slot)),
      inventory: this.actor.dataSet.itemTypes.list.map(type => ({
        ...type,
        items: this.actor.inventory.filter(item => item.type === type.key)
      })),
    }

    data.ui = {
      inventoryHidden: this._inventoryHidden,
    }
    data.actor = this.actor
    return data
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    // if (!this.options.editable) return;
  }
}

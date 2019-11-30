/**
 * Extend the basic ItemSheet with some very simple modifications
 */
import AutoSubmitSheet from './AutoSubmitSheet.js'
import CharacterDispositions from "./CharacterDispositions.js"

export default class TrainingSheet extends ItemSheet {
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
			template: "systems/sw-tor/templates/training-sheet.html",
			width: 520,
			height: 360,
		})
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for rendering the Item sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData() {
    const data = super.getData()
    data.modsList = Object.keys(data.data.mods).map(key => ({key, value: data.data.mods[key]}))
    data.dispositionList = CharacterDispositions.list
    return data
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {object}   The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html)

    // Activate tabs
    let tabs = html.find('.tabs')
    let initial = this._sheetTab
    new Tabs(tabs, {
      initial: initial,
      callback: clicked => this._sheetTab = clicked.data("tab")
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return

    // Make the Training sheet droppable for items
    this.form.ondragover = ev => this._onDragOver(ev)
    this.form.ondrop = ev => this._onDrop(ev)

    // Delete Inventory Item
    html.find('.mod-delete').click(ev => {
      const li = $(ev.currentTarget).parents("[data-mod-key]")
      let mods = this.object.data.data.mods
      delete mods[li.data("modKey")]
      this.object.update({ [`data.mods`]: mods })
      li.slideUp(200, () => this.render(false))
    });
  }

  /**
   * Allow the Training sheet to be a displayed as a valid drop-zone
   * @private
   */
  _onDragOver(event) {
    event.preventDefault();
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropped data on the Actor sheet
   * @private
   */
  _onDrop(event) {
    event.preventDefault();

    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if ( data.type !== "Item" ) return;
    }
    catch (err) {
      return false;
    }

    // Case 1 - Import from a Compendium pack
    if ( data.pack ) {
      //actor.importItemFromCollection(data.pack, data.id);
      let pack = game.packs.find(p => p.collection === data.pack)
      pack.getEntry(data.id).then(e => {
        if(e.type !== "skill")
          return
        this.object.update({ [`data.mods.${e.data.key}`]: 0 })
      })
    }

    //TODO Here must be cleaned up

    // Case 2 - Data explicitly provided
    else if ( data.data ) {
      if(data.data.type !== "skill")
        return
      this.object.update({ [`data.mods.${data.data.data.key}`]: 0 })
    }

    // Case 3 - Import from World entity
    else {
      let item = game.items.get(data.id);
      if ( !item ) return;
      if(data.data.type !== "skill")
        return
      this.object.update({ [`data.mods.${data.data.data.key}`]: 0 })
    }
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event, formData) {
    return this.object.update(formData)
  }
}

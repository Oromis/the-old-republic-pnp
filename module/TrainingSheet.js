import AutoSubmitSheet from './AutoSubmitSheet.js'
import CharacterDispositions from './CharacterDispositions.js'
import {detectPropertyType} from './CharacterFormulas.js'
import Attributes from './Attributes.js'
import Skills from './Skills.js'
import ObjectUtils from './ObjectUtils.js'
import Metrics from './Metrics.js'

function resolveModLabel(key) {
  let type = ''
  try {
    type = detectPropertyType({key})
  } catch(e) {}
  if(type === 'skill') {
    return ObjectUtils.try(Skills.getMap()[key], 'label', { default: key })
  } else if(type === 'attribute') {
    return ObjectUtils.try(Attributes.map[key], 'label', { default: key })
  } else if(type === 'metric') {
    return ObjectUtils.try(Metrics.map[key], 'label', { default: key })
  }
  return key
}

export function describeTraining(training) {
  let desc = 'GP: '.concat( training.data.gp)
  for (const key of Object.keys(training.data.mods)) {
    desc = desc.concat('\n', resolveModLabel(key), ': ', training.data.mods[key])
  }
  return desc
}

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
    data.modsList = Object.keys(data.data.mods).map(key => ({
      key,
      value: data.data.mods[key],
      label: resolveModLabel(key)
    }))
    data.dispositionList = CharacterDispositions.list.map(e => ({
      ...e,
      value: data.data.dispositions[e.key]
    }))
    if(data.data.baseTraining) {
      data.baseTrainingEffects = describeTraining(data.data.baseTraining)
    }
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

    // Delete Mod Item
    html.find('.mod-delete').click(ev => {
      const li = $(ev.currentTarget).parents("[data-mod-key]")
      this.deleteMod(li.data("modKey"))
      li.slideUp(200, () => this.render(false))
    });

    // Add New Mod Item
    html.find('.mod-add').click(ev => {
      const li = $(ev.currentTarget).parents("[data-mod-key]")
      let key = html.find('.mod-new-key')[0].value
      let value = html.find('.mod-new-value')[0].value
      this.addMod(key, value)
      this.item.update({
        'data.newKey': '',
        'data.newValue': '',
      })
      this.render(false)
    });

    html.find('.mod-new').on('keypress', e => {
      if (e.key === 'Enter') {
        html.find('.mod-add').click()
      }
    })

    // Delete BaseTraining Item
    html.find('.baseTraining-delete').click(ev => {
      this.item.update({
        'data.baseTraining': null
      })
      this.render(false)
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
      let pack = game.packs.find(p => p.collection === data.pack)
      pack.getEntry(data.id).then(e => {
        this.handleDrop(e.type, e)
      })
    }

    // Case 2 - Data explicitly provided
    else if ( data.data ) {
      this.handleDrop(data.data.type, data.data)
    }

    // Case 3 - Import from World entity
    else {
      let item = game.items.get(data.id);
      if ( !item ) return;
      this.handleDrop(item.data.type, item.data)
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
    return this.item.update(formData)
  }

  addMod(key, value) {
    if(key.length < 1)
      return
    this.item.update({ [`data.mods.${key}`]: (value || 0) })
  }

  deleteMod(key) {
    this.item.update({
      'data.mods': { [`-=${key}`]: null }
    })
  }

  handleDrop(type, item) {
    if(type === 'training') {
      this.item.update({
        'data.baseTraining': item
      })
    } else if(item.data.key) {
      this.addMod(item.data.key)
    }
  }
}

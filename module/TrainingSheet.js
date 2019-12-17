import AutoSubmitSheet from './AutoSubmitSheet.js'
import CharacterDispositions from './CharacterDispositions.js'
import ObjectUtils from './ObjectUtils.js'
import {onDragOver, onDropItem, resolveEffectLabel} from './SheetUtils.js'

export function describeTraining(training) {
  let desc = 'GP: '.concat( training.data.gp)
  for (const effect of training.data.effects) {
    desc = desc.concat('\n', effect.label || resolveEffectLabel(effect.key), ': ', effect.value)
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
    this.form.ondragover = onDragOver()
    this.form.ondrop = onDropItem(this.handleDrop)

    // Delete Effect
    html.find('.effect-delete').click(ev => {
      const li = $(ev.currentTarget).parents("[data-effect-key]")
      this.deleteEffect(li.data("effectKey"))
      li.slideUp(200, () => this.render(false))
    });

    // Add New Effect
    html.find('.effect-add').click(ev => {
      const li = $(ev.currentTarget).parents("[data-effect-key]")
      let key = html.find('.effect-new-key')[0].value
      let value = html.find('.effect-new-value')[0].value
      this.addEffect({key, value})
      this.item.update({
        'data.newKey': '',
        'data.newValue': '',
      })
      this.render(false)
    });

    html.find('.effect-new').on('keypress', e => {
      if (e.key === 'Enter') {
        html.find('.effect-add').click()
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

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event, formData) {
    const effects = ObjectUtils.cloneDeep(this.item.data.data.effects || [])
    for (const key of Object.keys(formData)) {
      let match
      if ((match = key.match(/data\.effects\[(\d+)]\.value/))) {
        const index = match[1]
        if (effects.length >= index) {
          effects[index].value = +formData[key]
        }
      }
    }
    formData['data.effects'] = effects
    return this.item.update(formData)
  }

  addEffect(newEffect) {
    if(!newEffect.key || newEffect.key.length < 1)
      return
    if(!newEffect.value)
      newEffect.value = 0
    if(!newEffect.label)
      newEffect.label = resolveEffectLabel(newEffect.key)
    const itemData = this.item.data.data
    this.item.update({ 'data.effects': [...(itemData.effects || []), ObjectUtils.pick(newEffect, ['key', 'label', 'value'])] })
  }

  deleteEffect(key) {
    this.item.update({
      'data.effects': ( this.item.data.data.effects || []).filter((v, i) => v.key !== key),
    })
  }

  handleDrop = (type, item) => {
    if(type === 'training') {
      this.item.update({
        'data.baseTraining': item
      })
    } else if(item.name && item.data.key) {
      this.addEffect({label: item.name, key: item.data.key})
    }
  }
}

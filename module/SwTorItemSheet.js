import AutoSubmitSheet from './AutoSubmitSheet.js'
import DamageTypes from './DamageTypes.js'
import {analyzeDamageFormula, analyzeExpression, onDragOver, onDropItem, resolveModLabel} from './SheetUtils.js'
import SlotTypes from './SlotTypes.js'
import ItemTypes from './ItemTypes.js'

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
    const type = ItemTypes.map[data.item.type] || ItemTypes.map.other
    data.computed = {}
    data.flags = {
      isWeapon: type.isWeapon,
      isMeleeWeapon: type.isMeleeWeapon,
      isRangedWeapon: type.isRangedWeapon,
      isWearable: type.isWearable,
      isEquippable: type.isEquippable,
      hasEffects: type.hasEffects,
      isOwned: this.item.isOwned
    }
    if (data.flags.isWeapon) {
      data.computed.damage = analyzeDamageFormula({ path: [data.data.damage, 'formula'], defaultExpr: '0' })
      data.computed.skill = {
        key: data.data.skill,
        label: resolveModLabel(data.data.skill, { defaultLabel: '' }),
      }
    }
    if (data.flags.isRangedWeapon) {
      data.computed.precision = analyzeExpression({ path: [data.data.precision, 'formula'] })
      data.computed.projectileEnergy = analyzeExpression({ path: [data.data.projectileEnergy, 'formula'] })
    }
    if (data.flags.hasEffects) {
      const effects = data.data.effects || []
      if (Array.isArray(effects)) {
        data.computed.effects = effects
      } else {
        data.computed.effects = Object.entries(effects).map(([key, value]) => ({ key, value, label: key }))
      }
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

    html.find('.new-effect').click(() => {
      this.item.update({
        'data.effects': { ...this.item.data.data.effects, '': null }
      })
    })
    html.find('.delete-effect').click(e => {
      const targetKey = e.currentTarget.getAttribute('data-index')
      this.item.update({
        'data.effects': { [`-=${targetKey}`]: null }
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
    }
  }

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event, formData) {
    const slotTypes = []
    const effects = {}
    for (const key of Object.keys(formData)) {
      let match
      if ((match = key.match(/data\.slotTypes\[(\d+)]/))) {
        slotTypes[match[1]] = formData[key]
        delete formData[key]
      } else if ((match = key.match(/data\.effects\[(\d+)]\.key/))) {
        const valueKey = `data.effects[${match[1]}].value`
        effects[formData[key]] = formData[valueKey]
        delete formData[key]
        delete formData[valueKey]
      }
    }
    for (const key of Object.keys(this.item.data.data.effects || {})) {
      if (!Object.keys(effects).includes(key)) {
        effects[`-=${key}`] = null
      }
    }
    formData['data.slotTypes'] = slotTypes
    formData['data.effects'] = effects

    return this.item.update(formData)
  }
}

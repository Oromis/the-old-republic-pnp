import AutoSubmitSheet from './AutoSubmitSheet.js'
import DamageTypes from './DamageTypes.js'
import {analyzeDamageFormula, analyzeExpression, onDragOver, onDropItem, resolveModLabel} from './SheetUtils.js'
import SlotTypes from './SlotTypes.js'
import ItemTypes from './ItemTypes.js'
import ObjectUtils from './ObjectUtils.js'
import Metrics from './Metrics.js'
import ResistanceTypes from './ResistanceTypes.js'

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
      data.computed.effects = data.data.effects || []
      data.computed.newEffect = { isCustom: !ObjectUtils.try(data.data.newEffect, 'type', { default: '' }) }
      data.effects = this._getEffects()
    }
    data.damageTypes = DamageTypes.list
    data.slotTypes = SlotTypes.list
    return data
  }

  _getEffects() {
    return [
      ...Metrics.list,
      ...ResistanceTypes.list.map(r => ({ key: `r_${r.key}`, label: r.label })),
    ]
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
      const itemData = this.item.data.data
      const newEffect = itemData.newEffect
      if (newEffect != null) {
        if (newEffect.type) {
          // Predefined type
          newEffect.key = newEffect.type
          newEffect.label = this._getEffects().find(e => e.key === newEffect.type).label
        }
        if (newEffect.key && typeof newEffect.value === 'number') {
          if (!newEffect.label) {
            newEffect.label = newEffect.key
          }
          this.item.update({
            'data.effects': [...(itemData.effects || []), ObjectUtils.pick(newEffect, ['key', 'label', 'value'])],
            'data.newEffect': { key: '', label: '', value: '' }
          })
        }
      }
    })
    html.find('.delete-effect').click(e => {
      const targetKey = +e.currentTarget.getAttribute('data-index')
      this.item.update({
        'data.effects': (this.item.data.data.effects || []).filter((v, i) => i !== targetKey),
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
    } else if (item.data.key && typeof item.data.key === 'string') {
      this.item.update({
        'data.newEffect.type': '',
        'data.newEffect.key': item.data.key,
        'data.newEffect.label': item.name,
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
    const effects = ObjectUtils.cloneDeep(this.item.data.data.effects || [])
    for (const key of Object.keys(formData)) {
      let match
      if ((match = key.match(/data\.slotTypes\[(\d+)]/))) {
        slotTypes[match[1]] = formData[key]
        delete formData[key]
      } else if ((match = key.match(/data\.effects\[(\d+)]\.value/))) {
        const index = match[1]
        if (effects.length >= index) {
          effects[index].value = +formData[key]
        }
      }
    }
    formData['data.slotTypes'] = slotTypes
    formData['data.effects'] = effects

    return this.item.update(formData)
  }
}

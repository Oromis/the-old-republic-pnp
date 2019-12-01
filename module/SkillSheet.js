/**
 * Extend the basic ItemSheet with some very simple modifications
 */
import AutoSubmitSheet from './AutoSubmitSheet.js'
import Attributes from './Attributes.js'
import SkillCategories from './SkillCategories.js'
import XpTable from './XpTable.js'
import RangeTypes from './RangeTypes.js'
import DurationTypes from './DurationTypes.js'
import { Parser } from './vendor/expr-eval/expr-eval.js'
import ObjectUtils from './ObjectUtils.js'

export default class SkillSheet extends ItemSheet {
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
			template: "systems/sw-tor/templates/skill-sheet.html",
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
    const isForceSkill = this.skill.type === 'force-skill'

    data.attributes = Attributes.list
    data.skillCategories = SkillCategories.list
    data.xpCategories = XpTable.getCategories()
    data.computed = {
      isRegularSkill: this.skill.type === 'skill',
      isForceSkill,
    }

    if (isForceSkill) {
      data.rangeTypes = RangeTypes.list
      data.durationTypes = DurationTypes.list
      data.computed.hasRangeField = data.data.range.type === RangeTypes.map.m.key
      data.computed.hasDurationField = data.data.duration.type === DurationTypes.map.rounds.key
      if (data.computed.hasDurationField) {
        try {
          const expr = Parser.parse(ObjectUtils.try(data.data.duration, 'formula', { default: '' }))
          data.computed.durationVariables = expr.variables()
        } catch (e) {
          data.computed.durationFormulaError = true
        }
      }
      try {
        const expr = Parser.parse(ObjectUtils.try(data.data.cost, 'oneTime', { default: '0' }))
        data.computed.oneTimeCostVariables = expr.variables()
      } catch (e) {
        data.computed.oneTimeCostError = true
      }
      const durationType = ObjectUtils.try(data.data.duration, 'type')
      data.computed.hasPerTurnCost = durationType === DurationTypes.map.channeling.key || durationType === DurationTypes.map.toggle.key
      if (data.computed.hasPerTurnCost) {
        try {
          const expr = Parser.parse(ObjectUtils.try(data.data.cost, 'perTurn', { default: '0' }))
          data.computed.perTurnCostVariables = expr.variables()
        } catch (e) {
          data.computed.perTurnCostError = true
        }
      }
    }
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
  }

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event, formData) {
    const key = formData['data.key']
    if (key != null) {
      formData['data.key'] = key.toLowerCase()
    }

    return this.object.update(formData)
  }

  get skill() {
    return this.item
  }
}

/**
 * Extend the basic ItemSheet with some very simple modifications
 */
import AutoSubmitSheet from './AutoSubmitSheet.js'
import Attributes from './datasets/HumanoidAttributes.js' // TODO make dynamic
import SkillCategories from './SkillCategories.js'
import XpTable from './XpTable.js'
import RangeTypes from './RangeTypes.js'
import DurationTypes from './DurationTypes.js'
import ObjectUtils from './ObjectUtils.js'
import EffectModifiers from './EffectModifiers.js'
import ForceDispositions from './ForceDispositions.js'
import {analyzeExpression} from './SheetUtils.js'

export default class SkillSheet extends ItemSheet {
  constructor(...args) {
    super(...args);

    /**
     * Keep track of the currently active sheet tab
     * @type {string}
     */
    this._sheetTab = "description"

    const autoSubmit = new AutoSubmitSheet(this)
    autoSubmit.addFilter('data.key', (obj, { name }) => {
      return { [name]: obj[name].toLowerCase() }
    })
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
      data.effectModifiers = EffectModifiers.list
      data.dispositions = ForceDispositions.list
      data.computed.hasRangeField = data.data.range.type === RangeTypes.map.m.key
      data.computed.hasDurationField = data.data.duration.type === DurationTypes.map.rounds.key
      if (data.computed.hasDurationField) {
        data.computed.duration = analyzeExpression({ path: [data.data.duration, 'formula'] })
      }
      const durationType = ObjectUtils.try(DurationTypes.map, ObjectUtils.try(data.data.duration, 'type'), { default: DurationTypes.map.instant })
      data.computed.hasPerTurnCost = !!durationType.hasPerTurnCost
      if (data.computed.hasPerTurnCost) {
        data.computed.perTurnCost = analyzeExpression({ path: [data.data.cost, 'perTurn', 'formula'], defaultExpr: '0' })
      }
      data.computed.hasOneTimeCost = !!durationType.hasOneTimeCost
      if (data.computed.hasOneTimeCost) {
        data.computed.oneTimeCost = analyzeExpression({ path: [data.data.cost, 'oneTime', 'formula'], defaultExpr: '0' })
      }
      data.computed.effect = analyzeExpression({ path: [data.data.effect, 'formula'], defaultExpr: '0' })
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
    return Promise.resolve()
  }

  get skill() {
    return this.item
  }
}

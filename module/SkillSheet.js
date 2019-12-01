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
import EffectModifiers from './EffectModifiers.js'
import ForceDispositions from './ForceDispositions.js'

function analyzeExpression({ path, defaultExpr = '' }) {
  try {
    const text = ObjectUtils.try(...path) || defaultExpr
    const expr = Parser.parse(text)
    return { variables: expr.variables() }
  } catch (e) {
    return { error: true }
  }
}

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
      data.effectModifiers = EffectModifiers.list
      data.dispositions = ForceDispositions.list
      data.computed.hasRangeField = data.data.range.type === RangeTypes.map.m.key
      data.computed.hasDurationField = data.data.duration.type === DurationTypes.map.rounds.key
      if (data.computed.hasDurationField) {
        data.computed.duration = analyzeExpression({ path: [data.data.duration, 'formula'] })
      }
      data.computed.oneTimeCost = analyzeExpression({ path: [data.data.cost, 'oneTime'], defaultExpr: '0' })
      const durationType = ObjectUtils.try(data.data.duration, 'type')
      data.computed.hasPerTurnCost = durationType === DurationTypes.map.channeling.key || durationType === DurationTypes.map.toggle.key
      if (data.computed.hasPerTurnCost) {
        data.computed.perTurnCost = analyzeExpression({ path: [data.data.cost, 'perTurn'], defaultExpr: '0' })
      }
      data.computed.effect = analyzeExpression({ path: [data.data.effect, 'value'], defaultExpr: '0' })
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

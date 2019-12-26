/**
 * Extend the basic ItemSheet with some very simple modifications
 */
import AutoSubmitSheet from './AutoSubmitSheet.js'
import Attributes from './datasets/HumanoidAttributes.js' // TODO make dynamic
import SkillCategories from './datasets/SkillCategories.js'
import XpTable from './XpTable.js'
import RangeTypes from './RangeTypes.js'
import DurationTypes from './datasets/DurationTypes.js'
import ObjectUtils from './ObjectUtils.js'
import EffectModifiers from './EffectModifiers.js'
import ForceDispositions from './ForceDispositions.js'
import {analyzeExpression} from './SheetUtils.js'

export default class SkillSheet extends ItemSheet {
  constructor(...args) {
    super(...args);

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
			classes: ["sw-tor", "sheet", "item", 'skill'],
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

    data.computed = {}

    if (this.skill.isForceSkill) {
      data.computed.hasRangeField = data.data.range.type === RangeTypes.map.m.key
      data.computed.hasPerTurnCost = !!this.skill.duration.hasPerTurnCost
      if (data.computed.hasPerTurnCost) {
        data.computed.perTurnCost = analyzeExpression({ path: [data.data.cost, 'perTurn', 'formula'], defaultExpr: '0' })
      }
      data.computed.hasOneTimeCost = !!this.skill.duration.hasOneTimeCost
      if (data.computed.hasOneTimeCost) {
        data.computed.oneTimeCost = analyzeExpression({ path: [data.data.cost, 'oneTime', 'formula'], defaultExpr: '0' })
      }
      data.computed.effect = analyzeExpression({ path: [data.data.effect, 'formula'], defaultExpr: '0' })
    }
    data.item = this.item
    data.skill = this.item
    return data
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

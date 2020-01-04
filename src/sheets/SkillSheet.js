/**
 * Extend the basic ItemSheet with some very simple modifications
 */
import AutoSubmitSheet from './AutoSubmitSheet.js'

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
    data.skill = this.item
    return data
  }

  /* -------------------------------------------- */

  /**
   * Disable regular submit since we use an AutoSubmit form
   */
  _updateObject() {
    return Promise.resolve()
  }

  get skill() {
    return this.item
  }
}

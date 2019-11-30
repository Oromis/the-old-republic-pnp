import SwTorItemSheet from "./SwTorItemSheet.js"
import SwTorActorSheet from "./SwTorActorSheet.js"
import SkillSheet from "./SkillSheet.js"
import TrainingSheet from "./TrainingSheet.js"

import Config from './Config.js'
import Attributes from './Attributes.js'
import ObjectUtils from './ObjectUtils.js'

function formatMod(val) {
  return val > 0 ? `+${val}` : val
}

Hooks.once("init", async function() {
  console.log(`Initializing ${Config.system.title}`);

  // await loadTemplates([])

  Handlebars.registerHelper({
    concat: (...args) => args.filter(arg => typeof arg === 'string').join(''),
    class: ({ hash: { when, then, otherwise = '' } }) => new Handlebars.SafeString(`class="${when ? then : otherwise}"`),
    formatAttrKey: key => key.toUpperCase(),
    formatAttrLabel: key => ObjectUtils.try(Attributes.map[key], 'label'),
    formatMod,
    formatExplanation: components => components.map(component => `${component.label}: ${formatMod(component.value)}`).join(' | '),
    stepButtons: ({ hash: { val, name, buttonClass = 'small char set-value', valueClass = '' } }) => {
      return new Handlebars.SafeString(`
        <button type="button" class="${buttonClass}" data-field="${name}" data-value="${val - 1}" data-action="-">-</button>
        <span class="${valueClass}">${val}</span>
        <button type="button" class="${buttonClass}" data-field="${name}" data-value="${val + 1}" data-action="+">+</button>
      `)
    }
  })

	/**
	 * Set an initiative formula for the system
	 * @type {String}
	 */
	CONFIG.initiative.formula = "1d6"

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet)
  Actors.registerSheet("sw-tor", SwTorActorSheet, { makeDefault: true })
  Items.unregisterSheet("core", ItemSheet)
  Items.registerSheet("sw-tor", SwTorItemSheet, {makeDefault: true})
  Items.registerSheet("sw-tor", SkillSheet)
  Items.registerSheet("sw-tor", TrainingSheet)
})

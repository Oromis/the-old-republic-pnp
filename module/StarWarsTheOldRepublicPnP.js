import SwTorItemSheet from "./SwTorItemSheet.js"
import SwTorActorSheet from "./SwTorActorSheet.js"
import SkillSheet from "./SkillSheet.js"

import Config from './Config.js'
import Attributes from './Attributes.js'
import ObjectUtils from './ObjectUtils.js'

function formatMod(val) {
  return val > 0 ? `+${val}` : val
}

const ERROR_CLASS = 'has-error'

Hooks.once("init", async function() {
  console.log(`Initializing ${Config.system.title}`);

  // await loadTemplates([])

  Handlebars.registerHelper({
    concat: (...args) => args.filter(arg => typeof arg === 'string').join(''),
    class: ({ hash: { when, then, otherwise = '' } }) => new Handlebars.SafeString(`class="${when ? then : otherwise}"`),
    errorClass: ({ hash: { when, unless } }) => {
      if (when) {
        return ERROR_CLASS
      } else if (unless != null && !unless) {
        return ERROR_CLASS
      } else {
        return ''
      }
    },
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
    },
    metricView: ({ hash: { metric, linked } }) => new Handlebars.SafeString(`
      <div class="metric" title="${metric.key} | ${metric.label}">
        <div class="metric-bar" style="width: ${(metric.value / metric.max.total) * 100}%; background-color: ${metric.backgroundColor};"></div>
        <label class="metric-value flex-row multi-item flex-center">
          <input type="text" ${linked ? 'data-link' : 'name'}="data.metrics.${metric.key}.value" value="${metric.value}" class="align-right transparent flex-grow" />
          <span>/</span>
          <span class="input-width flex-grow">${metric.max.total}</span>
        </label>
      </div>
    `)
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
})

import SwTorItemSheet from "./SwTorItemSheet.js";
import SwTorActorSheet from "./SwTorActorSheet.js";

import Config from './Config.js'

Hooks.once("init", async function() {
  console.log(`Initializing ${Config.system.title}`);

  Handlebars.registerHelper({
    concat: (...args) => args.filter(arg => typeof arg === 'string').join(''),
    formatAttrKey: key => key.toUpperCase(),
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
	CONFIG.initiative.formula = "1d6";

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("sw-tor", SwTorActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("sw-tor", SwTorItemSheet, {makeDefault: true});
});

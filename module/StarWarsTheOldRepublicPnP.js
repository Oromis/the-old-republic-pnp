import SwTorItemSheet from "./SwTorItemSheet.js";
import SwTorActorSheet from "./SwTorActorSheet.js";

import Config from './Config.js'

Hooks.once("init", async function() {
  console.log(`Initializing ${Config.system.title}`);

  Handlebars.registerHelper('formatAttrKey', key => key.toUpperCase())
  Handlebars.registerHelper('formatBool', key => key ? 'Yo' : 'Nope')

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

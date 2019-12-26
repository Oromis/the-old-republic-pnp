import SwTorItemSheet from "./sheets/SwTorItemSheet.js"
import SwTorActorSheet from "./sheets/SwTorActorSheet.js"
import SkillSheet from "./sheets/SkillSheet.js"
import TrainingSheet from "./sheets/TrainingSheet.js"

import Config from './Config.js'
import {registerHelpers} from './templating/Helpers.js'
import {measureDistance} from './overrides/DistanceMeasurement.js'
import {registerSystemSettings} from './Settings.js'
import {migrateWorld} from './migration/Migrations.js'
import SwTorActor from './actor/SwTorActor.js'
import SwTorItem from './item/SwTorItem.js'

Hooks.once("init", async function() {
  console.log(`Initializing ${Config.system.title}`);

  await loadTemplates([
    'systems/sw-tor/templates/check-roll.html'
  ])

  registerHelpers()

	/**
	 * Set an initiative formula for the system
	 * @type {String}
	 */
	CONFIG.initiative.formula = "1d6 + (@attributes.in.value + @attributes.sc.value) / 10"
  CONFIG.Actor.entityClass = SwTorActor
  CONFIG.Item.entityClass = SwTorItem

  registerSystemSettings()

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet)
  Actors.registerSheet("sw-tor", SwTorActorSheet, { makeDefault: true })
  Items.unregisterSheet("core", ItemSheet)
  Items.registerSheet("sw-tor", SwTorItemSheet, { makeDefault: true })
  Items.registerSheet("sw-tor", SkillSheet, { types: ['skill', 'force-skill'], makeDefault: true })
  Items.registerSheet("sw-tor", TrainingSheet, { types: ['training'], makeDefault: true })
})

Hooks.once("ready", function() {
  const NEEDS_MIGRATION_VERSION = 0.2
  let needMigration = game.settings.get("sw-tor", "systemMigrationVersion") < NEEDS_MIGRATION_VERSION
  if ( needMigration && game.user.isGM ) return migrateWorld()
})

Hooks.on("canvasInit", function() {
  SquareGrid.prototype.measureDistance = measureDistance;
})

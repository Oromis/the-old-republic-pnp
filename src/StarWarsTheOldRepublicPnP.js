import PhysicalItemSheet from "./sheets/PhysicalItemSheet.js"
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
import ChatMessageMixin from './ChatMessageMixin.js'
import { installCombatTrackerHook } from './overrides/CombatTrackerHook.js'
import { injectDefaultItemPermissions } from './overrides/DefaultItemPermission.js'
import { injectPrivateMeasurements } from './overrides/PrivateMeasurements.js'
import InnateAbilitySheet from './sheets/InnateAbilitySheet.js'
import Shortcuts, {CTRL, SHIFT} from './shortcuts/Shortcuts.js'
import {installGlobalShortcuts} from './shortcuts/GlobalShortcuts.js'
import SpecialAbilitySheet from './sheets/SpecialAbilitySheet.js'

Hooks.once("init", async function() {
  console.log(`Initializing ${Config.system.title}`);

  registerHelpers()

  if (game.actors && game.actors.entities && game.actors.entities.length > 0) {
    console.warn(`${game.actors.entities.length} actors exist before the actor class is overridden`)
  }

	CONFIG.initiative.formula = "@initiativeFormula"
  CONFIG.initiative.decimals = 2

  CONFIG.Actor.entityClass = SwTorActor
  CONFIG.Item.entityClass = SwTorItem

  // Chat Messages cannot currently (0.4.3) be extended like actors and items, so we need to mix
  // our functionality into the existing class
  new ChatMessageMixin(ChatMessage.prototype)

  registerSystemSettings()

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet)
  Actors.registerSheet("sw-tor", SwTorActorSheet, { makeDefault: true })
  Items.unregisterSheet("core", ItemSheet)
  Items.registerSheet("sw-tor", PhysicalItemSheet, { types: ["melee-weapon", "ranged-weapon", "wearable", "consumable", "other"], makeDefault: true })
  Items.registerSheet("sw-tor", SkillSheet, { types: ['skill', 'force-skill'], makeDefault: true })
  Items.registerSheet("sw-tor", TrainingSheet, { types: ['training'], makeDefault: true })
  Items.registerSheet("sw-tor", InnateAbilitySheet, { types: ['innate-ability'], makeDefault: true })
  Items.registerSheet("sw-tor", SpecialAbilitySheet, { types: ['special-ability'], makeDefault: true })

  // We need to register actors & sheets before doing any async work. Otherwise Actors might be
  // created before the class is overridden
  await loadTemplates([
    'systems/sw-tor/templates/check-roll.html',
    'systems/sw-tor/templates/check-preview.html',
    'systems/sw-tor/templates/effects-editor.html',
  ])
})

Hooks.once("ready", async function() {
  const NEEDS_MIGRATION_VERSION = 0.3
  let needMigration = game.settings.get("sw-tor", "systemMigrationVersion") < NEEDS_MIGRATION_VERSION
  if ( needMigration && game.user.isGM ) {
    await migrateWorld()
  }

  installCombatTrackerHook()
  injectDefaultItemPermissions()
  injectPrivateMeasurements()

  installGlobalShortcuts()
})

Hooks.on("canvasInit", function() {
  SquareGrid.prototype.measureDistance = measureDistance;
})

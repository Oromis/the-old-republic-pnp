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
import {installGlobalShortcuts} from './shortcuts/GlobalShortcuts.js'
import SpecialAbilitySheet from './sheets/SpecialAbilitySheet.js'
import {installTokenInputHandler} from './overrides/TokenInputHandler.js'
import CombatActionSheet from './sheets/CombatActionSheet.js'
import ActiveEffectSheet from './sheets/ActiveEffectSheet.js'
import BeastActorSheet from './sheets/BeastActorSheet.js'
import {fullLoadPromise, setFullLoadPromise} from './util/GameUtils.js'

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

  // Override the way the default Roll class renders. It sucks.
  CONFIG.Roll.template = 'systems/sw-tor/templates/partials/standard-roll.html'
  CONFIG.Roll.tooltip = 'systems/sw-tor/templates/partials/standard-roll-dice.html'

  // Chat Messages cannot currently (0.4.3) be extended like actors and items, so we need to mix
  // our functionality into the existing class
  new ChatMessageMixin(ChatMessage.prototype)

  registerSystemSettings()

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet)
  Actors.registerSheet("sw-tor", SwTorActorSheet, { types: ['pc', 'npc'], makeDefault: true })
  Actors.registerSheet("sw-tor", BeastActorSheet, { types: ['beast'], makeDefault: true })

  Items.unregisterSheet("core", ItemSheet)
  Items.registerSheet("sw-tor", PhysicalItemSheet, { types: ["melee-weapon", "ranged-weapon", "wearable", "consumable", "other"], makeDefault: true })
  Items.registerSheet("sw-tor", SkillSheet, { types: ['skill', 'force-skill'], makeDefault: true })
  Items.registerSheet("sw-tor", TrainingSheet, { types: ['training'], makeDefault: true })
  Items.registerSheet("sw-tor", InnateAbilitySheet, { types: ['innate-ability'], makeDefault: true })
  Items.registerSheet("sw-tor", SpecialAbilitySheet, { types: ['special-ability'], makeDefault: true })
  Items.registerSheet("sw-tor", CombatActionSheet, { types: ['combat-action'], makeDefault: true })
  Items.registerSheet("sw-tor", ActiveEffectSheet, { types: ['active-effect'], makeDefault: true })

  // We need to register actors & sheets before doing any async work. Otherwise Actors might be
  // created before the class is overridden
  setFullLoadPromise(loadTemplates([
    'systems/sw-tor/templates/check-message.html',
    'systems/sw-tor/templates/check-roll.html',
    'systems/sw-tor/templates/check-preview.html',
    'systems/sw-tor/templates/effects-editor.html',
    'systems/sw-tor/templates/partials/offensive-equipment.html',
    'systems/sw-tor/templates/partials/defensive-equipment.html',
    'systems/sw-tor/templates/partials/incoming-damage.html',
    'systems/sw-tor/templates/partials/inventory-category.html',
    'systems/sw-tor/templates/partials/target-distance.html',
    'systems/sw-tor/templates/partials/missing-skills.html',
    'systems/sw-tor/templates/partials/char-generator.html',
  ]))

  await fullLoadPromise()
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
  installTokenInputHandler()
})

Hooks.on("canvasInit", function() {
  SquareGrid.prototype.measureDistance = measureDistance;
})

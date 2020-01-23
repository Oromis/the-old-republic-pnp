import { getActorByTokenId } from '../util/GameUtils.js'
import SwTorActor from '../actor/SwTorActor.js'
import CombatAction from '../item/CombatAction.js'

function processHookArg(combat) {
  if (combat instanceof CombatEncounters) {
    return combat.entities[0]
  } else {
    return combat
  }
}

export function installCombatTrackerHook() {
  if (game.user.isGM) {
    Hooks.on('createCombat', onCreateCombat)
    Hooks.on('updateCombat', onUpdateCombat)
    Hooks.on('deleteCombat', onDeleteCombat)
  }
}

async function onCreateCombat(combat) {
  combat = processHookArg(combat)

  // Make a CombatAction for the combat
  await CombatAction.get(combat.id)
}

async function onUpdateCombat(combat) {
  combat = processHookArg(combat)

  const gms = game.users.entities.filter(u => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id))
  if (gms.length > 0 && game.user.id === gms[0].id) {
    // We're the GM with the lowest ID => we need to take care of all of the housekeeping stuff. Great.
    let forward = true
    if (combat.current.round < combat.previous.round ||
      (combat.current.round === combat.previous.round && combat.current.turn < combat.previous.turn)) {
      // GM clicked "back"
      forward = false
    }

    const combatAction = await CombatAction.get(combat.id)
    if (forward) {
      const prevActor = getActorByTokenId(combat.previous.tokenId)
      if (prevActor instanceof SwTorActor) {
        await prevActor.exitTurn({ combat, round: combat.previous.round })
      }
      combatAction != null && await combatAction.onNextTurn()
      const currentActor = getActorByTokenId(combat.current.tokenId)
      if (currentActor instanceof SwTorActor) {
        await currentActor.enterTurn({ combat, round: combat.current.round })
      }
    } else {
      const currentActor = getActorByTokenId(combat.current.tokenId)
      if (currentActor instanceof SwTorActor) {
        await currentActor.undoExitTurn({ combat, round: combat.current.round })
      }
      combatAction != null && await combatAction.onPrevTurn()
      const actor = getActorByTokenId(combat.previous.tokenId)
      if (actor instanceof SwTorActor) {
        await actor.undoEnterTurn({ combat, round: combat.previous.round })
      }
    }
  }
}

async function onDeleteCombat(combat) {
  combat = processHookArg(combat)

  const combatAction = await CombatAction.get(combat.id)
  if (combatAction != null) {
    return combatAction.delete()
  }
}

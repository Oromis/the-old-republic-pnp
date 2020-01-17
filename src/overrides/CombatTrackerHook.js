import { getActorByTokenId } from '../util/GameUtils.js'
import SwTorActor from '../actor/SwTorActor.js'
import CombatAction from '../item/CombatAction.js'

export function installCombatTrackerHook() {
  if (game.user.isGM) {
    Hooks.on('updateCombat', onUpdateCombat)
    Hooks.on('deleteCombat', onDeleteCombat)
  }
}

function onUpdateCombat(combat) {
  const gms = game.users.entities.filter(u => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id))
  if (gms.length > 0 && game.user.id === gms[0].id) {
    // We're the GM with the lowest ID => we need to take care of all of the housekeeping stuff. Great.
    let forward = true
    if (combat.current.round < combat.previous.round ||
      (combat.current.round === combat.previous.round && combat.current.turn < combat.previous.turn)) {
      // GM clicked "back"
      forward = false
    }

    if (forward) {
      const actor = getActorByTokenId(combat.current.tokenId)
      if (actor instanceof SwTorActor) {
        actor.enterTurn({ combat, round: combat.current.round })
      }
    } else {
      const actor = getActorByTokenId(combat.previous.tokenId)
      if (actor instanceof SwTorActor) {
        actor.undoEnterTurn({ combat, round: combat.previous.round })
      }
    }
  }
}

async function onDeleteCombat(combat) {
  const combatAction = await CombatAction.get(combat.id)
  if (combatAction != null) {
    return combatAction.delete()
  }
}

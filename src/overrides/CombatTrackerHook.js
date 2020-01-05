import { getActorByTokenId } from '../util/GameUtils.js'
import SwTorActor from '../actor/SwTorActor.js'

export function installCombatTrackerHook() {
  if (game.user.isGM) {
    Hooks.on('updateCombat', onUpdateCombat)
  }
}

function onUpdateCombat(combat) {
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

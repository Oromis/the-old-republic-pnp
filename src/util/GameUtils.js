export function getActor({ tokenId, sceneId, actorId }) {
  let result = null
  if (tokenId && sceneId) {
    const scene = game.scenes.get(sceneId)
    if (scene != null) {
      result = getActorByTokenId(tokenId, { scene })
    }
  }

  if (result == null && actorId != null) {
    result = game.actors.get(actorId)
  }
  return result
}

export function getActorByTokenId(tokenId, { scene = game.scenes.active } = {}) {
  if (canvas.scene === scene) {
    // Scene is currently active => query the token from the TokenLayer. This works for TokenActors
    // and regular Actors alike.
    const token = canvas.tokens.get(tokenId)
    if (token != null) {
      return token.actor
    } else {
      return null
    }
  } else {
    // Scene is not currently active. The following will only work for linked actors
    // (which is not a big problem in practice)
    const token = scene.getEmbeddedEntity('tokens', tokenId)
    if (token != null) {
      return game.actors.get(token.actorId)
    } else {
      return null
    }
  }
}

export function getActorByTokenId(tokenId, { scene = game.scenes.active } = {}) {
  const token = scene.getEmbeddedEntity('tokens', tokenId)
  if (token != null) {
    return game.actors.get(token.actorId)
  } else {
    return null
  }
}

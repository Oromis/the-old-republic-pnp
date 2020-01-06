export function injectPrivateMeasurements() {
  const originalEmit = game.socket.emit
  game.socket.emit = function emitOverride(...args) {
    const [command, userId, data] = args
    if (command === 'cursor') {
      const showCursors = game.settings.get('core', 'showCursors')
      const showRuler = game.settings.get('sw-tor', 'rulerVisible')
      if (!showCursors && !showRuler) {
        // No need to broadcast cursor information then ...
        return Promise.resolve()
      }

      if (!showRuler && data != null && data.ruler != null) {
        // Delete ruler data
        data.ruler = null
      }
    }

    return originalEmit.call(this, ...args)
  }
}

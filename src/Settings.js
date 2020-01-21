export const registerSystemSettings = function() {
  /**
   * Track the system version upon which point a migration was last applied
   */
  game.settings.register("sw-tor", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  })

  game.settings.register("sw-tor", "rulerVisible", {
    name: "Öffentliches Distanzmessen",
    hint: "Zeigt deine Messvorgänge anderen Spielern an",
    scope: "client",
    config: true,
    default: true,
    type: Boolean,
  })

  game.settings.register("sw-tor", "autoShowCombatActionTracker", {
    name: "Combat Action Tracker automatisch anzeigen",
    hint: "Zeigt den Combat Action Tracker an, sobald jemand angreift oder verteidigt.",
    scope: "client",
    config: true,
    default: true,
    type: Boolean,
  })
}

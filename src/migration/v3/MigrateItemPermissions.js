import ObjectUtils from '../../util/ObjectUtils.js'

export async function migrateItemPermissions() {
  for (const item of game.items.entities) {
    if (ObjectUtils.try(item.data.permission, 'default', { default: 0 }) < CONST.ENTITY_PERMISSIONS.OBSERVER) {
      await item.update({ 'permission.default': CONST.ENTITY_PERMISSIONS.OBSERVER })
    }
  }
}

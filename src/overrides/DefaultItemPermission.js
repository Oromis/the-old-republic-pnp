export function injectDefaultItemPermissions() {
  const originalCreateItem = Item.create
  Item.create = function createItemOverride(data, ...rest) {
    if (data.permission == null) {
      data.permission = {}
    }
    if (data.permission.default == null) {
      data.permission.default = CONST.ENTITY_PERMISSIONS.OBSERVER
    }
    return originalCreateItem.call(this, data, ...rest)
  }
}

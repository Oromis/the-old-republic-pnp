export function migrateItemEffects(item, updateData) {
  const effects = item.effects
  if (effects != null && !Array.isArray(effects)) {
    updateData['data.effects'] = Object.entries(effects).map(([k, v]) => ({ key: k, label: k, value: v}))
  }
}
